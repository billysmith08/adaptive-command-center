import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SHARED_DRIVE_NAME = 'ADPTV LLC';
const SD = { supportsAllDrives: true, includeItemsFromAllDrives: true };

function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID,
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
}

async function navigatePath(drive, driveId, parentId, pathParts) {
  let currentId = parentId;
  for (const part of pathParts) {
    const res = await drive.files.list({
      q: `name='${part.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${currentId}' in parents`,
      fields: 'files(id, name)',
      ...SD,
      corpora: 'drive',
      driveId,
    });
    const folder = res.data.files?.[0];
    if (!folder) return null;
    currentId = folder.id;
  }
  return currentId;
}

async function listVendorDocs(drive, driveId, folderId) {
  const foldersRes = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    ...SD,
    corpora: 'drive',
    driveId,
    pageSize: 200,
  });

  const results = {};
  const folders = foldersRes.data.files || [];

  await Promise.all(folders.map(async (folder) => {
    const filesRes = await drive.files.list({
      q: `'${folder.id}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
      fields: 'files(id, name, webViewLink, modifiedTime)',
      ...SD,
      corpora: 'drive',
      driveId,
      pageSize: 20,
    });
    const files = filesRes.data.files || [];
    if (files.length > 0) {
      results[folder.name] = files.map(f => ({
        id: f.id,
        name: f.name,
        link: f.webViewLink,
        modified: f.modifiedTime,
      }));
    } else {
      // Empty vendor folder = no docs
      results[folder.name] = [];
    }
  }));

  return results;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    
    const drive = getDriveClient();

    const drivesRes = await drive.drives.list({ pageSize: 50 });
    const allDrives = drivesRes.data.drives || [];
    const targetDrive = allDrives.find(d => d.name === SHARED_DRIVE_NAME) || allDrives.find(d => d.name.toLowerCase().includes('adptv'));

    if (!targetDrive) {
      return NextResponse.json({ success: false, error: `Shared drive "${SHARED_DRIVE_NAME}" not found.` });
    }

    const driveId = targetDrive.id;
    const basePath = ['ADMIN', 'External Vendors (W9 & Work Comp)', 'Dec 2025 - Dec 2026'];
    const baseId = await navigatePath(drive, driveId, driveId, basePath);
    if (!baseId) {
      return NextResponse.json({ success: false, error: 'Base path not found in Drive.' });
    }

    const docFolders = {
      coi: '2026 COIs & Workers Comp',
      w9: '2026 W9s',
    };

    // ─── SEARCH MODE: find vendor folders matching query ───
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const vendors = [];
      const seen = new Set();

      for (const [docKey, folderName] of Object.entries(docFolders)) {
        const folderId = await navigatePath(drive, driveId, baseId, [folderName]);
        if (!folderId) continue;

        // List all vendor subfolders
        const foldersRes = await drive.files.list({
          q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: 'files(id, name)',
          ...SD,
          corpora: 'drive',
          driveId,
          pageSize: 200,
        });

        for (const folder of (foldersRes.data.files || [])) {
          if (!folder.name.toLowerCase().includes(q)) continue;
          
          // Get files inside vendor folder
          const filesRes = await drive.files.list({
            q: `'${folder.id}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
            fields: 'files(id, name, webViewLink)',
            ...SD,
            corpora: 'drive',
            driveId,
            pageSize: 10,
          });
          const files = filesRes.data.files || [];

          if (!seen.has(folder.name)) {
            seen.add(folder.name);
            vendors.push({
              name: folder.name,
              type: 'Vendor',
              email: '',
              contact: '',
              dept: '',
              drive: {},
            });
          }
          const vendor = vendors.find(v => v.name === folder.name);
          if (files.length > 0) {
            vendor.drive[docKey] = { found: true, file: files[0].name, link: files[0].webViewLink };
          }
        }
      }

      return NextResponse.json({ success: true, vendors });
    }

    // ─── SYNC MODE: full compliance scan ───
    const compliance = {};

    for (const [docKey, folderName] of Object.entries(docFolders)) {
      const folderId = await navigatePath(drive, driveId, baseId, [folderName]);
      if (!folderId) continue;

      const vendorDocs = await listVendorDocs(drive, driveId, folderId);

      for (const [vendorName, files] of Object.entries(vendorDocs)) {
        if (!compliance[vendorName]) compliance[vendorName] = {};
        if (files.length > 0) {
          const latestFile = files[0];
          compliance[vendorName][docKey] = {
            done: true,
            file: latestFile.name,
            link: latestFile.link,
          };
        } else {
          compliance[vendorName][docKey] = { done: false };
        }
      }
    }

    return NextResponse.json({
      success: true,
      compliance,
      vendorCount: Object.keys(compliance).length,
      scannedAt: new Date().toISOString(),
    });

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
