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
const SHARED_DRIVE_NAME = 'ADPTV LLC';

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

    // Step 3: Find the ADPTV LLC shared drive
    let sharedDriveId = null;
    try {
      const drivesRes = await drive.drives.list({ pageSize: 50 });
      const allDrives = drivesRes.data.drives || [];
      steps.push({ step: 'listDrives', status: 'ok', count: allDrives.length, names: allDrives.map(d => d.name) });
      
      const targetDrive = allDrives.find(d => d.name === SHARED_DRIVE_NAME);
      if (targetDrive) {
        sharedDriveId = targetDrive.id;
        steps.push({ step: 'findDrive', status: 'found', driveId: sharedDriveId, driveName: SHARED_DRIVE_NAME });
      } else {
        const partialMatch = allDrives.find(d => d.name.toLowerCase().includes('adptv'));
        if (partialMatch) {
          sharedDriveId = partialMatch.id;
          steps.push({ step: 'findDrive', status: 'partial_match', driveId: sharedDriveId, driveName: partialMatch.name });
        } else {
          steps.push({ step: 'findDrive', status: 'NOT_FOUND', searched: SHARED_DRIVE_NAME, available: allDrives.map(d => d.name) });
          return NextResponse.json({ 
            success: false, 
            error: `Shared drive "${SHARED_DRIVE_NAME}" not found. Available drives: ${allDrives.map(d => d.name).join(', ') || 'none'}. Make sure the service account (${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}) is added as a member of the shared drive.`,
            steps 
          }, { status: 404 });
        }
      }
    } catch (driveErr) {
      steps.push({ step: 'listDrives', status: 'error', error: driveErr.message });
      return NextResponse.json({ success: false, error: `Failed to list shared drives: ${driveErr.message}`, steps }, { status: 500 });
    }

    // Step 4: Navigate folder path within the shared drive
    const pathParts = basePath.split('/').filter(Boolean);
    let currentParentId = sharedDriveId; // Start from the shared drive root
    
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      try {
        const query = `name='${part.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${currentParentId}' in parents`;
        
        const res = await drive.files.list({
          q: query,
          fields: 'files(id, name, parents)',
          ...SD,
          corpora: 'drive',
          driveId: sharedDriveId,
        });
        
        const folder = res.data.files?.[0];
        if (folder) {
          currentParentId = folder.id;
          steps.push({ step: `navigate[${i}]`, segment: part, status: 'found', folderId: folder.id });
        } else {
          // List what IS in the parent to help debug
          let subfolders = [];
          try {
            const debugList = await drive.files.list({
              q: `'${currentParentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
              fields: 'files(id, name)',
              ...SD,
              corpora: 'drive',
              driveId: sharedDriveId,
              pageSize: 50,
            });
            subfolders = (debugList.data.files || []).map(f => f.name);
          } catch (_) {}
          
          steps.push({ step: `navigate[${i}]`, segment: part, status: 'NOT_FOUND', parentId: currentParentId, existingSubfolders: subfolders });
          
          return NextResponse.json({ 
            success: false, 
            error: `Folder not found: "${part}" (step ${i + 1} of path "${basePath}"). Found these folders instead: ${subfolders.join(', ') || 'none'}. Check the exact folder name in the "${SHARED_DRIVE_NAME}" shared drive.`,
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

    // Step 5: Find or create vendor subfolder
    let vendorFolderId;
    let folderCreated = false;
    
    try {
      const vendorQuery = `name='${vendorName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${currentParentId}' in parents`;
      const vendorRes = await drive.files.list({
        q: vendorQuery,
        fields: 'files(id, name)',
        ...SD,
        corpora: 'drive',
        driveId: sharedDriveId,
      });
      
      const existingFolder = vendorRes.data.files?.[0];
      
      if (existingFolder) {
        vendorFolderId = existingFolder.id;
        steps.push({ step: 'vendorFolder', status: 'found_existing', folderId: vendorFolderId, name: vendorName });
      } else {
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

    // Step 6: Upload the file
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
