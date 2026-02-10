import { google } from 'googleapis';

let driveClient = null;

function getDriveClient() {
  if (driveClient) return driveClient;
  
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

// Shared Drive flags — must be on EVERY call
const SD = { supportsAllDrives: true, includeItemsFromAllDrives: true };

// Find a folder by name within a parent folder
export async function findFolder(name, parentId = null) {
  const drive = getDriveClient();
  let query = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) query += ` and '${parentId}' in parents`;
  
  const res = await drive.files.list({ q: query, fields: 'files(id, name)', ...SD });
  return res.data.files?.[0] || null;
}

// Navigate a folder path like "ADMIN/External Vendors/..." and return the final folder ID
export async function navigatePath(pathParts) {
  let parentId = null;
  for (const part of pathParts) {
    const folder = await findFolder(part, parentId);
    if (!folder) return null;
    parentId = folder.id;
  }
  return parentId;
}

// Create a folder inside a parent
export async function createFolder(name, parentId) {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : [],
    },
    fields: 'id, name, webViewLink',
    supportsAllDrives: true,
  });
  return res.data;
}

// Ensure a vendor folder exists at the correct path, creating it if needed
export async function ensureVendorFolder(basePath, vendorName) {
  const parts = basePath.split('/').filter(Boolean);
  
  const baseId = await navigatePath(parts);
  if (!baseId) {
    throw new Error(`Base path not found: ${basePath}. Make sure the folder structure exists and is shared with the service account.`);
  }
  
  let vendorFolder = await findFolder(vendorName, baseId);
  let created = false;
  
  if (!vendorFolder) {
    vendorFolder = await createFolder(vendorName, baseId);
    created = true;
  }
  
  return { folderId: vendorFolder.id, folderName: vendorFolder.name, created };
}

// Upload a file to a specific folder
export async function uploadFile(folderId, fileName, fileBuffer, mimeType) {
  const drive = getDriveClient();
  const { Readable } = await import('stream');
  
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: 'id, name, webViewLink',
    supportsAllDrives: true,
  });
  
  return res.data;
}

// List files in a folder
export async function listFiles(folderId) {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink, size)',
    orderBy: 'modifiedTime desc',
    ...SD,
  });
  return res.data.files || [];
}

// Search for vendor folders across COI and W9 directories
export async function searchVendorDocs(vendorName) {
  const drive = getDriveClient();
  const query = `name contains '${vendorName.replace(/'/g, "\\'")}' and trashed=false`;
  
  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name, mimeType, parents, modifiedTime, webViewLink)',
    pageSize: 50,
    ...SD,
    corpora: 'allDrives',
  });
  
  return res.data.files || [];
}

// Scan a doc type folder and return all vendor subfolders with their files
export async function scanDocTypeFolder(basePath) {
  const parts = basePath.split('/').filter(Boolean);
  const baseId = await navigatePath(parts);
  if (!baseId) return [];
  
  const drive = getDriveClient();
  
  const foldersRes = await drive.files.list({
    q: `'${baseId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    orderBy: 'name',
    ...SD,
  });
  
  const vendors = [];
  for (const folder of foldersRes.data.files || []) {
    const files = await listFiles(folder.id);
    vendors.push({
      vendorName: folder.name,
      folderId: folder.id,
      files: files.map(f => ({ name: f.name, id: f.id, modified: f.modifiedTime, link: f.webViewLink })),
    });
  }
  
  return vendors;
}
