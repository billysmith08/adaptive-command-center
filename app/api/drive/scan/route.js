import { NextResponse } from 'next/server';
import { google } from 'googleapis';

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

async function findFolder(drive, name, parentId) {
  let query = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) query += ` and '${parentId}' in parents`;
  const res = await drive.files.list({ q: query, fields: 'files(id, name)', spaces: 'drive' });
  return res.data.files?.[0] || null;
}

async function navigatePath(drive, parts) {
  let parentId = null;
  for (const part of parts) {
    const folder = await findFolder(drive, part, parentId);
    if (!folder) return null;
    parentId = folder.id;
  }
  return parentId;
}

async function getVendorFoldersInPath(drive, basePath) {
  const parts = basePath.split('/').filter(Boolean);
  const baseId = await navigatePath(drive, parts);
  if (!baseId) return [];

  const foldersRes = await drive.files.list({
    q: `'${baseId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    orderBy: 'name',
    pageSize: 200,
  });

  const results = [];
  for (const folder of foldersRes.data.files || []) {
    const filesRes = await drive.files.list({
      q: `'${folder.id}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink, size)',
      orderBy: 'modifiedTime desc',
      pageSize: 10,
    });
    results.push({
      vendorName: folder.name,
      folderId: folder.id,
      files: (filesRes.data.files || []).map(f => ({
        name: f.name, id: f.id, modified: f.modifiedTime, link: f.webViewLink, size: f.size,
      })),
    });
  }
  return results;
}

const BASE = 'ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026';
const DOC_PATHS = {
  coi: `${BASE}/2026 COIs & Workers Comp`,
  w9: `${BASE}/2026 W9s`,
};

export async function GET(request) {
  try {
    const drive = getDriveClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    if (type && DOC_PATHS[type]) {
      const vendors = await getVendorFoldersInPath(drive, DOC_PATHS[type]);
      if (search) {
        const q = search.toLowerCase();
        return NextResponse.json({ type, vendors: vendors.filter(v => v.vendorName.toLowerCase().includes(q)) });
      }
      return NextResponse.json({ type, vendors });
    }

    // Scan both COI and W9 folders
    const [coiVendors, w9Vendors] = await Promise.all([
      getVendorFoldersInPath(drive, DOC_PATHS.coi),
      getVendorFoldersInPath(drive, DOC_PATHS.w9),
    ]);

    // Merge into unified vendor list
    const vendorMap = {};
    for (const v of coiVendors) {
      if (!vendorMap[v.vendorName]) vendorMap[v.vendorName] = { name: v.vendorName, drive: {} };
      vendorMap[v.vendorName].drive.coi = { found: true, files: v.files, folderId: v.folderId, file: v.files[0]?.name || null };
    }
    for (const v of w9Vendors) {
      if (!vendorMap[v.vendorName]) vendorMap[v.vendorName] = { name: v.vendorName, drive: {} };
      vendorMap[v.vendorName].drive.w9 = { found: true, files: v.files, folderId: v.folderId, file: v.files[0]?.name || null };
    }

    const merged = Object.values(vendorMap).map(v => ({
      name: v.name,
      contact: v.name,
      email: "",
      type: "Vendor",
      dept: "Production",
      drive: {
        coi: v.drive.coi || { found: false },
        w9: v.drive.w9 || { found: false },
        banking: { found: false },
        contract: { found: false },
        invoice: { found: false },
      },
    }));

    if (search) {
      const q = search.toLowerCase();
      return NextResponse.json({ vendors: merged.filter(v => v.name.toLowerCase().includes(q)) });
    }

    return NextResponse.json({ vendors: merged, coiCount: coiVendors.length, w9Count: w9Vendors.length });
  } catch (error) {
    console.error('Drive scan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
