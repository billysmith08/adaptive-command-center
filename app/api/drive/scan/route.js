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

const SD = { supportsAllDrives: true, includeItemsFromAllDrives: true };

export async function GET(request) {
  try {
    const drive = getDriveClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    if (!search || !search.trim()) {
      return NextResponse.json({ vendors: [], message: 'Provide a search query' });
    }

    const q = search.trim();
    const escapedQ = q.replace(/'/g, "\\'");
    let allFiles = [];
    const seenIds = new Set();

    // Search by name across all Shared Drives (fast — single API call)
    try {
      const nameResults = await drive.files.list({
        q: `name contains '${escapedQ}' and trashed=false`,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink, size, parents)',
        ...SD, corpora: 'allDrives',
        orderBy: 'modifiedTime desc',
        pageSize: 50,
      });
      for (const f of (nameResults.data.files || [])) {
        if (!seenIds.has(f.id)) { allFiles.push(f); seenIds.add(f.id); }
      }
    } catch (e) { console.error('Name search error:', e.message); }

    // Also try fullText search (finds content matches)
    try {
      const textResults = await drive.files.list({
        q: `fullText contains '${escapedQ}' and trashed=false`,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink, size, parents)',
        ...SD, corpora: 'allDrives',
        orderBy: 'relevance desc',
        pageSize: 30,
      });
      for (const f of (textResults.data.files || [])) {
        if (!seenIds.has(f.id)) { allFiles.push(f); seenIds.add(f.id); }
      }
    } catch (e) { /* ignore fullText errors */ }

    // For any folders found, also list their contents (one level)
    const folderFiles = allFiles.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    for (const folder of folderFiles.slice(0, 5)) {
      try {
        const contents = await drive.files.list({
          q: `'${folder.id}' in parents and trashed=false`,
          fields: 'files(id, name, mimeType, modifiedTime, webViewLink, size, parents)',
          ...SD,
          pageSize: 50,
        });
        for (const f of (contents.data.files || [])) {
          if (!seenIds.has(f.id)) { allFiles.push(f); seenIds.add(f.id); }
        }
      } catch (e) { /* skip */ }
    }

    // Resolve parent folder names (batch — only unique parents)
    const parentIds = new Set();
    for (const f of allFiles) {
      if (f.parents) f.parents.forEach(pid => parentIds.add(pid));
    }
    const parentNames = {};
    const parentPromises = [...parentIds].map(async (pid) => {
      try {
        const pf = await drive.files.get({ fileId: pid, fields: 'name', supportsAllDrives: true });
        parentNames[pid] = pf.data.name;
      } catch (e) { /* ignore */ }
    });
    await Promise.all(parentPromises);

    // Group files by vendor name
    const vendorMap = {};

    for (const f of allFiles) {
      if (f.mimeType === 'application/vnd.google-apps.folder') {
        if (!vendorMap[f.name]) {
          vendorMap[f.name] = { name: f.name, folderId: f.id, folderLink: f.webViewLink, files: [], hasCoi: false, hasW9: false, hasNda: false, hasContract: false };
        }
        continue;
      }

      const fileName = f.name.toLowerCase();
      const isCoi = fileName.includes('coi') || fileName.includes('certificate of insurance') || fileName.includes('insurance') || fileName.includes('comp');
      const isW9 = fileName.includes('w9') || fileName.includes('w-9');
      const isNda = fileName.includes('nda') || fileName.includes('non-disclosure');
      const isContract = fileName.includes('contract') || fileName.includes('agreement') || fileName.includes('sow');

      let vendorKey = q;
      if (f.parents && f.parents[0] && parentNames[f.parents[0]]) {
        vendorKey = parentNames[f.parents[0]];
      }

      if (!vendorMap[vendorKey]) {
        vendorMap[vendorKey] = { name: vendorKey, files: [], hasCoi: false, hasW9: false, hasNda: false, hasContract: false };
      }

      vendorMap[vendorKey].files.push({
        name: f.name, id: f.id, mimeType: f.mimeType, modified: f.modifiedTime,
        link: f.webViewLink, size: f.size,
        parentFolder: f.parents?.[0] ? parentNames[f.parents[0]] : null,
        isCoi, isW9, isNda, isContract,
      });

      if (isCoi) vendorMap[vendorKey].hasCoi = true;
      if (isW9) vendorMap[vendorKey].hasW9 = true;
      if (isNda) vendorMap[vendorKey].hasNda = true;
      if (isContract) vendorMap[vendorKey].hasContract = true;
    }

    const vendors = Object.values(vendorMap).map(v => {
      const coiFile = v.files.find(f => f.isCoi);
      const w9File = v.files.find(f => f.isW9);
      const ndaFile = v.files.find(f => f.isNda);
      const contractFile = v.files.find(f => f.isContract);

      return {
        name: v.name, contact: v.name, email: "", type: "Vendor", dept: "Production",
        fileCount: v.files.length, folderLink: v.folderLink || null,
        files: v.files.slice(0, 15),
        drive: {
          coi: coiFile ? { found: true, file: coiFile.name, link: coiFile.link } : { found: false },
          w9: w9File ? { found: true, file: w9File.name, link: w9File.link } : { found: false },
          nda: ndaFile ? { found: true, file: ndaFile.name, link: ndaFile.link } : { found: false },
          contract: contractFile ? { found: true, file: contractFile.name, link: contractFile.link } : { found: false },
        },
      };
    });

    return NextResponse.json({ vendors, totalFiles: allFiles.length, query: q });
  } catch (error) {
    console.error('Drive scan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
