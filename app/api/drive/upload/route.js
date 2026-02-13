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
    const projectFolderId = formData.get('projectFolderId');
    const vendorSubfolder = formData.get('vendorSubfolder');
    const globalMirror = formData.get('globalMirror') === 'true';
    const globalBasePath = formData.get('globalBasePath');
    
    steps.push({ step: 'parse', status: 'ok', vendorName, docType, basePath, projectFolderId: !!projectFolderId, fileName: file?.name, fileSize: file?.size });
    
    if (!file || !vendorName) {
      return NextResponse.json({ 
        success: false, 
        error: `Missing required fields: ${!file ? 'file ' : ''}${!vendorName ? 'vendorName ' : ''}`.trim(),
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

    // Step 3: Find the shared drive
    let sharedDriveId = null;
    try {
      const drivesRes = await drive.drives.list({ pageSize: 50 });
      const allDrives = drivesRes.data.drives || [];
      const targetDrive = allDrives.find(d => d.name === SHARED_DRIVE_NAME) || allDrives.find(d => d.name.toLowerCase().includes('adptv'));
      if (targetDrive) {
        sharedDriveId = targetDrive.id;
        steps.push({ step: 'findDrive', status: 'found', driveName: targetDrive.name });
      } else {
        return NextResponse.json({ success: false, error: `Shared drive not found`, steps }, { status: 404 });
      }
    } catch (driveErr) {
      return NextResponse.json({ success: false, error: `Failed to list drives: ${driveErr.message}`, steps }, { status: 500 });
    }

    // Helper: find folder in parent
    async function findFolder(parentId, name) {
      const res = await drive.files.list({
        q: `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`,
        fields: 'files(id, name, webViewLink)', ...SD, corpora: 'drive', driveId: sharedDriveId,
      });
      return res.data.files?.[0] || null;
    }
    async function findOrCreateFolder(parentId, name) {
      const existing = await findFolder(parentId, name);
      if (existing) return { id: existing.id, created: false };
      const created = await drive.files.create({
        requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
        fields: 'id, name, webViewLink', supportsAllDrives: true,
      });
      return { id: created.data.id, created: true };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let uploadFolderId;
    let folderCreated = false;

    // ═══ PROJECT-SCOPED UPLOAD ═══
    if (projectFolderId && vendorSubfolder) {
      try {
        // Navigate: projectFolderId → ADMIN → VENDORS → VendorName → Subfolder
        const adminFolder = await findOrCreateFolder(projectFolderId, 'ADMIN');
        const vendorsFolder = await findOrCreateFolder(adminFolder.id, 'VENDORS');
        const vendorFolder = await findOrCreateFolder(vendorsFolder.id, vendorName);
        folderCreated = vendorFolder.created;
        
        // Create all template subfolders if vendor folder was just created
        if (vendorFolder.created) {
          for (const sub of ['Agreements', 'Banking', 'COI', 'Invoices', 'Quotes', 'W9']) {
            await findOrCreateFolder(vendorFolder.id, sub);
          }
          steps.push({ step: 'vendorFolder', status: 'created_with_template', name: vendorName });
        }
        
        // Navigate to the specific subfolder (e.g. "Invoices", "COI", etc.)
        const subfolder = await findOrCreateFolder(vendorFolder.id, vendorSubfolder);
        uploadFolderId = subfolder.id;
        steps.push({ step: 'projectRoute', status: 'ok', path: `ADMIN/VENDORS/${vendorName}/${vendorSubfolder}` });
      } catch (navErr) {
        steps.push({ step: 'projectRoute', status: 'error', error: navErr.message });
        return NextResponse.json({ success: false, error: `Project folder navigation failed: ${navErr.message}`, steps }, { status: 500 });
      }
    }
    // ═══ LEGACY GLOBAL PATH UPLOAD ═══
    else if (basePath) {
      const pathParts = basePath.split('/').filter(Boolean);
      let currentParentId = sharedDriveId;
      
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        const folder = await findFolder(currentParentId, part);
        if (folder) {
          currentParentId = folder.id;
        } else {
          let subfolders = [];
          try {
            const debugList = await drive.files.list({
              q: `'${currentParentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
              fields: 'files(name)', ...SD, corpora: 'drive', driveId: sharedDriveId, pageSize: 50,
            });
            subfolders = (debugList.data.files || []).map(f => f.name);
          } catch (_) {}
          return NextResponse.json({ success: false, error: `Folder not found: "${part}" in path "${basePath}". Found: ${subfolders.join(', ')}`, steps }, { status: 404 });
        }
      }
      
      // Find or create vendor subfolder
      const vendorFolder = await findOrCreateFolder(currentParentId, vendorName);
      uploadFolderId = vendorFolder.id;
      folderCreated = vendorFolder.created;
    } else {
      return NextResponse.json({ success: false, error: 'Missing basePath or projectFolderId', steps }, { status: 400 });
    }

    // Step 6: Upload the file
    const uploadRes = await drive.files.create({
      requestBody: { name: file.name, parents: [uploadFolderId] },
      media: { mimeType: file.type || 'application/octet-stream', body: Readable.from(buffer) },
      fields: 'id, name, webViewLink', supportsAllDrives: true,
    });
    steps.push({ step: 'upload', status: 'ok', fileId: uploadRes.data.id });

    // ═══ GLOBAL MIRROR for W9/COI ═══
    let mirrorResult = null;
    if (globalMirror && globalBasePath && projectFolderId) {
      try {
        // Navigate global path
        const globalParts = globalBasePath.split('/').filter(Boolean);
        let globalParent = sharedDriveId;
        for (const part of globalParts) {
          const f = await findFolder(globalParent, part);
          if (f) { globalParent = f.id; } else { throw new Error(`Global path not found: "${part}"`); }
        }
        // Create vendor folder in global path
        const globalVendorFolder = await findOrCreateFolder(globalParent, vendorName);
        // Copy file
        const copied = await drive.files.copy({
          fileId: uploadRes.data.id,
          requestBody: { name: file.name, parents: [globalVendorFolder.id] },
          ...SD,
        });
        mirrorResult = { success: true, globalPath: globalBasePath, fileId: copied.data.id };
        steps.push({ step: 'globalMirror', status: 'ok', path: `${globalBasePath}/${vendorName}` });
      } catch (mirrorErr) {
        mirrorResult = { success: false, error: mirrorErr.message };
        steps.push({ step: 'globalMirror', status: 'warning', error: mirrorErr.message });
      }
    }

    return NextResponse.json({
      success: true,
      file: { name: uploadRes.data.name, id: uploadRes.data.id, link: uploadRes.data.webViewLink },
      folder: { id: uploadFolderId, created: folderCreated },
      mirror: mirrorResult,
      steps,
    });
    
  } catch (err) {
    return NextResponse.json({ 
      success: false, error: `Unexpected error: ${err.message}`, steps 
    }, { status: 500 });
  }
}
