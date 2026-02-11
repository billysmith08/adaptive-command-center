import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
}

const SD = { supportsAllDrives: true, includeItemsFromAllDrives: true };

export async function POST(request) {
  const steps = [];
  
  try {
    // Step 1: Parse form data
    const formData = await request.formData();
    const file = formData.get('file');
    const vendorName = formData.get('vendorName');
    const docType = formData.get('docType');
    const basePath = formData.get('basePath');
    
    steps.push({ step: 'parse', status: 'ok', vendorName, docType, basePath, fileName: file?.name, fileSize: file?.size });
    
    if (!file || !vendorName || !basePath) {
      return NextResponse.json({ 
        success: false, 
        error: `Missing required fields: ${!file ? 'file ' : ''}${!vendorName ? 'vendorName ' : ''}${!basePath ? 'basePath' : ''}`.trim(),
        steps 
      }, { status: 400 });
    }

    // Step 2: Init Drive client
    let drive;
    try {
      drive = getDriveClient();
      steps.push({ step: 'auth', status: 'ok' });
    } catch (authErr) {
      steps.push({ step: 'auth', status: 'failed', error: authErr.message });
      return NextResponse.json({ success: false, error: `Google Auth failed: ${authErr.message}`, steps }, { status: 500 });
    }

    // Step 3: Navigate the folder path segment by segment
    const pathParts = basePath.split('/').filter(Boolean);
    let currentParentId = null;
    
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      try {
        let query = `name='${part.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        if (currentParentId) query += ` and '${currentParentId}' in parents`;
        
        const res = await drive.files.list({
          q: query,
          fields: 'files(id, name, parents)',
          ...SD,
          corpora: 'allDrives',
        });
        
        const folder = res.data.files?.[0];
        if (folder) {
          currentParentId = folder.id;
          steps.push({ step: `navigate[${i}]`, segment: part, status: 'found', folderId: folder.id });
        } else {
          steps.push({ step: `navigate[${i}]`, segment: part, status: 'NOT_FOUND', query });
          return NextResponse.json({ 
            success: false, 
            error: `Folder not found: "${part}" (step ${i + 1} of path "${basePath}"). Make sure this exact folder exists in Google Drive and the service account has access.`,
            steps 
          }, { status: 404 });
        }
      } catch (navErr) {
        steps.push({ step: `navigate[${i}]`, segment: part, status: 'error', error: navErr.message });
        return NextResponse.json({ 
          success: false, 
          error: `Error navigating to "${part}": ${navErr.message}`,
          steps 
        }, { status: 500 });
      }
    }

    // Step 4: Find or create vendor subfolder
    let vendorFolderId;
    let folderCreated = false;
    
    try {
      const vendorQuery = `name='${vendorName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${currentParentId}' in parents`;
      const vendorRes = await drive.files.list({
        q: vendorQuery,
        fields: 'files(id, name)',
        ...SD,
      });
      
      const existingFolder = vendorRes.data.files?.[0];
      
      if (existingFolder) {
        vendorFolderId = existingFolder.id;
        steps.push({ step: 'vendorFolder', status: 'found_existing', folderId: vendorFolderId, name: vendorName });
      } else {
        // Create the vendor folder
        const createRes = await drive.files.create({
          requestBody: {
            name: vendorName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [currentParentId],
          },
          fields: 'id, name, webViewLink',
          supportsAllDrives: true,
        });
        vendorFolderId = createRes.data.id;
        folderCreated = true;
        steps.push({ step: 'vendorFolder', status: 'created', folderId: vendorFolderId, name: vendorName });
      }
    } catch (folderErr) {
      steps.push({ step: 'vendorFolder', status: 'error', error: folderErr.message });
      return NextResponse.json({ 
        success: false, 
        error: `Failed to find/create vendor folder "${vendorName}": ${folderErr.message}`,
        steps 
      }, { status: 500 });
    }

    // Step 5: Upload the file
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      
      const uploadRes = await drive.files.create({
        requestBody: {
          name: file.name,
          parents: [vendorFolderId],
        },
        media: {
          mimeType: file.type || 'application/octet-stream',
          body: Readable.from(buffer),
        },
        fields: 'id, name, webViewLink',
        supportsAllDrives: true,
      });
      
      steps.push({ step: 'upload', status: 'ok', fileId: uploadRes.data.id, fileName: uploadRes.data.name });
      
      return NextResponse.json({
        success: true,
        file: { name: uploadRes.data.name, id: uploadRes.data.id, link: uploadRes.data.webViewLink },
        folder: { id: vendorFolderId, created: folderCreated, path: `${basePath}/${vendorName}` },
        steps,
      });
    } catch (uploadErr) {
      steps.push({ step: 'upload', status: 'error', error: uploadErr.message });
      return NextResponse.json({ 
        success: false, 
        error: `File upload failed: ${uploadErr.message}`,
        steps 
      }, { status: 500 });
    }
    
  } catch (err) {
    return NextResponse.json({ 
      success: false, 
      error: `Unexpected error: ${err.message}`,
      stack: err.stack,
      steps 
    }, { status: 500 });
  }
}
