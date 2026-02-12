import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

const SHARED_DRIVE_NAME = 'ADPTV LLC';
const SD = { supportsAllDrives: true, includeItemsFromAllDrives: true };

const DEFAULT_TEMPLATE = [
  { name: 'ADMIN', children: [
    { name: 'BUDGET', children: [] },
    { name: 'CREW', children: [] },
    { name: 'From Client', children: [] },
    { name: 'VENDORS', children: [] },
  ]},
  { name: 'VENUE', children: [
    { name: 'Floorplans', children: [] },
  ]},
];

function getDriveClient(readOnly = false) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID,
    },
    scopes: [readOnly ? 'https://www.googleapis.com/auth/drive.readonly' : 'https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
}

async function findSharedDrive(drive) {
  const drivesRes = await drive.drives.list({ pageSize: 50 });
  const allDrives = drivesRes.data.drives || [];
  return allDrives.find(d => d.name === SHARED_DRIVE_NAME)
    || allDrives.find(d => d.name.toLowerCase().includes('adptv'));
}

async function findFolderInParent(drive, driveId, parentId, name) {
  const res = await drive.files.list({
    q: `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`,
    fields: 'files(id, name, webViewLink)',
    ...SD,
    corpora: 'drive',
    driveId,
  });
  return res.data.files?.[0] || null;
}

async function createFolderInParent(drive, parentId, name) {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id, name, webViewLink',
    supportsAllDrives: true,
  });
  return res.data;
}

async function ensureFolder(drive, driveId, parentId, name) {
  const existing = await findFolderInParent(drive, driveId, parentId, name);
  if (existing) return { ...existing, created: false };
  const created = await createFolderInParent(drive, parentId, name);
  return { ...created, created: true };
}

// Recursively create folder template (only in newly created project folders)
async function createTemplateRecursive(drive, parentId, template) {
  const results = [];
  for (const item of template) {
    const folder = await createFolderInParent(drive, parentId, item.name);
    results.push({ name: item.name, id: folder.id, created: true });
    if (item.children && item.children.length > 0) {
      await createTemplateRecursive(drive, folder.id, item.children);
    }
  }
  return results;
}

// ─── POST: ensure project folder or upload file ───
export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // File upload via FormData
    if (contentType.includes('multipart/form-data')) {
      return handleUpload(request);
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'ensure') {
      return handleEnsure(body);
    }

    if (action === 'scan-vendors') {
      return handleScanVendors(body);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Drive project error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── GET: browse folder contents ───
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json({ error: 'Missing folderId' }, { status: 400 });
    }

    const drive = getDriveClient(true);
    const sharedDrive = await findSharedDrive(drive);
    if (!sharedDrive) {
      return NextResponse.json({ error: `Shared drive "${SHARED_DRIVE_NAME}" not found` }, { status: 404 });
    }

    // List all items in folder (folders first, then files)
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink, size, iconLink, thumbnailLink)',
      orderBy: 'folder,name',
      pageSize: 200,
      ...SD,
      corpora: 'drive',
      driveId: sharedDrive.id,
    });

    const items = (res.data.files || []).map(f => ({
      id: f.id,
      name: f.name,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
      mimeType: f.mimeType,
      modified: f.modifiedTime,
      link: f.webViewLink,
      size: f.size ? parseInt(f.size) : null,
      icon: f.iconLink,
      thumbnail: f.thumbnailLink,
    }));

    // Sort: folders first (alphabetical), then files (alphabetical)
    items.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ success: true, items, folderId });
  } catch (err) {
    console.error('Drive browse error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Ensure project folder structure ───
async function handleEnsure(body) {
  const { clientName, projectCode, template } = body;

  if (!clientName || !projectCode) {
    return NextResponse.json({ error: 'Missing clientName or projectCode' }, { status: 400 });
  }

  // Extract year from project code (e.g., "26-FRANK-SYBER-PHX" → "2026")
  const yearPrefix = projectCode.match(/^(\d{2})-/)?.[1];
  if (!yearPrefix) {
    return NextResponse.json({ error: `Cannot extract year from project code: ${projectCode}` }, { status: 400 });
  }
  const year = `20${yearPrefix}`;

  const drive = getDriveClient();
  const sharedDrive = await findSharedDrive(drive);
  if (!sharedDrive) {
    return NextResponse.json({ error: `Shared drive "${SHARED_DRIVE_NAME}" not found` }, { status: 404 });
  }

  const driveId = sharedDrive.id;
  const steps = [];

  // Step 1: Find CLIENTS folder
  const clientsFolder = await findFolderInParent(drive, driveId, driveId, 'CLIENTS');
  if (!clientsFolder) {
    return NextResponse.json({ error: 'CLIENTS folder not found in ADPTV LLC shared drive' }, { status: 404 });
  }
  steps.push({ step: 'CLIENTS', id: clientsFolder.id, created: false });

  // Step 2: Ensure client folder
  const clientFolder = await ensureFolder(drive, driveId, clientsFolder.id, clientName);
  steps.push({ step: 'Client', name: clientName, id: clientFolder.id, created: clientFolder.created });

  // Step 3: Ensure year folder
  const yearFolder = await ensureFolder(drive, driveId, clientFolder.id, year);
  steps.push({ step: 'Year', name: year, id: yearFolder.id, created: yearFolder.created });

  // Step 4: Check if project code folder exists
  const existingProject = await findFolderInParent(drive, driveId, yearFolder.id, projectCode);

  if (existingProject) {
    // Folder exists — just link, don't touch contents
    steps.push({ step: 'ProjectCode', name: projectCode, id: existingProject.id, created: false, message: 'Already exists, linked without modification' });
    return NextResponse.json({
      success: true,
      folderId: existingProject.id,
      folderLink: existingProject.webViewLink,
      path: `CLIENTS/${clientName}/${year}/${projectCode}`,
      created: false,
      steps,
    });
  }

  // Step 5: Create project code folder + template
  const projectFolder = await createFolderInParent(drive, yearFolder.id, projectCode);
  steps.push({ step: 'ProjectCode', name: projectCode, id: projectFolder.id, created: true });

  // Step 6: Create template structure inside new project folder
  const folderTemplate = template || DEFAULT_TEMPLATE;
  const templateResults = await createTemplateRecursive(drive, projectFolder.id, folderTemplate);
  steps.push({ step: 'Template', folders: templateResults });

  return NextResponse.json({
    success: true,
    folderId: projectFolder.id,
    folderLink: projectFolder.webViewLink,
    path: `CLIENTS/${clientName}/${year}/${projectCode}`,
    created: true,
    steps,
  });
}

// ─── Upload file to a specific folder ───
async function handleUpload(request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const folderId = formData.get('folderId');

  if (!file || !folderId) {
    return NextResponse.json({ error: 'Missing file or folderId' }, { status: 400 });
  }

  const drive = getDriveClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const res = await drive.files.create({
    requestBody: {
      name: file.name,
      parents: [folderId],
    },
    media: {
      mimeType: file.type || 'application/octet-stream',
      body: Readable.from(buffer),
    },
    fields: 'id, name, webViewLink, mimeType, size, modifiedTime',
    supportsAllDrives: true,
  });

  return NextResponse.json({
    success: true,
    file: {
      id: res.data.id,
      name: res.data.name,
      link: res.data.webViewLink,
      mimeType: res.data.mimeType,
      size: res.data.size ? parseInt(res.data.size) : null,
      modified: res.data.modifiedTime,
    },
  });
}

// ─── Classify a file by name into a doc type ───
function classifyFile(fileName) {
  const lower = fileName.toLowerCase();
  if (/inv|invoice/.test(lower)) return 'invoice';
  if (/w[\-\s]?9/.test(lower)) return 'w9';
  if (/coi|cert.*ins|insurance|workers?\s*comp/.test(lower)) return 'coi';
  if (/contract|agreement|sow|scope/.test(lower)) return 'contract';
  if (/bank|ach|routing|wire/.test(lower)) return 'banking';
  return null; // unclassified
}

// ─── Scan project ADMIN/VENDORS for vendor docs ───
async function handleScanVendors(body) {
  const { projectFolderId } = body;
  if (!projectFolderId) {
    return NextResponse.json({ error: 'Missing projectFolderId' }, { status: 400 });
  }

  const drive = getDriveClient(true);
  const sharedDrive = await findSharedDrive(drive);
  if (!sharedDrive) {
    return NextResponse.json({ error: `Shared drive "${SHARED_DRIVE_NAME}" not found` }, { status: 404 });
  }
  const driveId = sharedDrive.id;

  // Navigate to ADMIN/VENDORS inside the project folder
  const adminFolder = await findFolderInParent(drive, driveId, projectFolderId, 'ADMIN');
  if (!adminFolder) {
    return NextResponse.json({ success: true, vendors: {}, message: 'No ADMIN folder found' });
  }
  const vendorsFolder = await findFolderInParent(drive, driveId, adminFolder.id, 'VENDORS');
  if (!vendorsFolder) {
    return NextResponse.json({ success: true, vendors: {}, message: 'No VENDORS folder found' });
  }

  // Scan VENDORS folder — could be flat (VENDORS/VendorName/files) or nested (VENDORS/Category/VendorName/files)
  const vendors = {};

  async function scanFolder(parentId, depth) {
    const res = await drive.files.list({
      q: `'${parentId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, webViewLink, modifiedTime)',
      orderBy: 'name',
      pageSize: 200,
      ...SD,
      corpora: 'drive',
      driveId,
    });
    const items = res.data.files || [];
    const subfolders = items.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    const files = items.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');

    if (files.length > 0) {
      // This folder contains files — it's a vendor folder
      const vendorName = items.length > 0 ? null : null; // We use the folder name from the caller
      return { hasFiles: true, files };
    }

    // Only subfolders — recurse into them (category or vendor folders)
    if (subfolders.length > 0 && depth < 3) {
      for (const sub of subfolders) {
        // Check if this subfolder has files (= vendor) or more folders (= category)
        const innerRes = await drive.files.list({
          q: `'${sub.id}' in parents and trashed=false`,
          fields: 'files(id, name, mimeType, webViewLink, modifiedTime)',
          orderBy: 'name',
          pageSize: 100,
          ...SD,
          corpora: 'drive',
          driveId,
        });
        const innerItems = innerRes.data.files || [];
        const innerFiles = innerItems.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
        const innerFolders = innerItems.filter(f => f.mimeType === 'application/vnd.google-apps.folder');

        if (innerFiles.length > 0) {
          // This subfolder has files — it's a vendor folder
          const vendorDocs = {};
          for (const file of innerFiles) {
            const docType = classifyFile(file.name);
            if (docType) {
              if (!vendorDocs[docType]) {
                vendorDocs[docType] = { done: true, file: file.name, link: file.webViewLink, modified: file.modifiedTime };
              }
            } else {
              // Unclassified files — store as "other"
              if (!vendorDocs.other) vendorDocs.other = [];
              vendorDocs.other.push({ name: file.name, link: file.webViewLink });
            }
          }
          vendors[sub.name] = { docs: vendorDocs, fileCount: innerFiles.length, folderId: sub.id };
        }

        // If it has more folders, recurse (category folder like "Operations")
        if (innerFolders.length > 0 && depth < 2) {
          for (const innerSub of innerFolders) {
            const deepRes = await drive.files.list({
              q: `'${innerSub.id}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
              fields: 'files(id, name, mimeType, webViewLink, modifiedTime)',
              orderBy: 'name',
              pageSize: 50,
              ...SD,
              corpora: 'drive',
              driveId,
            });
            const deepFiles = deepRes.data.files || [];
            if (deepFiles.length > 0) {
              const vendorDocs = {};
              for (const file of deepFiles) {
                const docType = classifyFile(file.name);
                if (docType) {
                  if (!vendorDocs[docType]) {
                    vendorDocs[docType] = { done: true, file: file.name, link: file.webViewLink, modified: file.modifiedTime };
                  }
                } else {
                  if (!vendorDocs.other) vendorDocs.other = [];
                  vendorDocs.other.push({ name: file.name, link: file.webViewLink });
                }
              }
              vendors[innerSub.name] = { docs: vendorDocs, fileCount: deepFiles.length, folderId: innerSub.id };
            }
          }
        }
      }
    }
    return { hasFiles: false };
  }

  await scanFolder(vendorsFolder.id, 0);

  return NextResponse.json({
    success: true,
    vendors,
    vendorCount: Object.keys(vendors).length,
    scannedAt: new Date().toISOString(),
  });
}
