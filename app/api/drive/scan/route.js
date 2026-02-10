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

export async function GET(request) {
  try {
    const drive = getDriveClient();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    if (!search || !search.trim()) {
      return NextResponse.json({ vendors: [], message: 'Provide a search query' });
    }

    const q = search.trim();

    // Search entire Drive for files/folders matching the vendor name
    // Search by name and fullText across all shared files
    const nameQuery = `name contains '${q.replace(/'/g, "\\'")}' and trashed=false`;
    const fullTextQuery = `fullText contains '${q.replace(/'/g, "\\'")}' and trashed=false`;

    const [nameResults, textResults] = await Promise.all([
      drive.files.list({
        q: nameQuery,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink, size, parents)',
        orderBy: 'modifiedTime desc',
        pageSize: 50,
      }),
      drive.files.list({
        q: fullTextQuery,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink, size, parents)',
        orderBy: 'modifiedTime desc',
        pageSize: 30,
      }),
    ]);

    // Merge and deduplicate
    const allFiles = [...(nameResults.data.files || [])];
    const seenIds = new Set(allFiles.map(f => f.id));
    for (const f of (textResults.data.files || [])) {
      if (!seenIds.has(f.id)) {
        allFiles.push(f);
        seenIds.add(f.id);
      }
    }

    // Group files by likely vendor name
    // For folders: the folder name itself is the vendor
    // For files: try to get parent folder name
    const vendorMap = {};
    const folderIds = new Set();

    // First pass: identify vendor folders
    for (const f of allFiles) {
      if (f.mimeType === 'application/vnd.google-apps.folder') {
        folderIds.add(f.id);
        if (!vendorMap[f.name]) {
          vendorMap[f.name] = {
            name: f.name,
            folderId: f.id,
            files: [],
            hasCoi: false,
            hasW9: false,
          };
        }
      }
    }

    // Second pass: categorize files
    for (const f of allFiles) {
      if (f.mimeType === 'application/vnd.google-apps.folder') continue;

      const fileName = f.name.toLowerCase();
      // Check if file is a COI or W9 based on filename
      const isCoi = fileName.includes('coi') || fileName.includes('certificate of insurance') || fileName.includes('insurance');
      const isW9 = fileName.includes('w9') || fileName.includes('w-9');

      // Try to associate with a vendor name from the search
      // Use the search term as the vendor grouping key
      const vendorKey = q;
      if (!vendorMap[vendorKey]) {
        vendorMap[vendorKey] = {
          name: q,
          files: [],
          hasCoi: false,
          hasW9: false,
        };
      }

      vendorMap[vendorKey].files.push({
        name: f.name,
        id: f.id,
        mimeType: f.mimeType,
        modified: f.modifiedTime,
        link: f.webViewLink,
        size: f.size,
        isCoi,
        isW9,
      });

      if (isCoi) vendorMap[vendorKey].hasCoi = true;
      if (isW9) vendorMap[vendorKey].hasW9 = true;
    }

    // Convert to array and build drive compliance status
    const vendors = Object.values(vendorMap).map(v => {
      const coiFile = v.files.find(f => f.isCoi);
      const w9File = v.files.find(f => f.isW9);

      return {
        name: v.name,
        contact: v.name,
        email: "",
        type: "Vendor",
        dept: "Production",
        fileCount: v.files.length,
        files: v.files.slice(0, 10), // Return up to 10 files for preview
        drive: {
          coi: coiFile ? { found: true, file: coiFile.name, link: coiFile.link } : { found: false },
          w9: w9File ? { found: true, file: w9File.name, link: w9File.link } : { found: false },
          banking: { found: false },
          contract: { found: false },
          invoice: { found: false },
        },
      };
    });

    return NextResponse.json({
      vendors,
      totalFiles: allFiles.length,
      query: q,
    });
  } catch (error) {
    console.error('Drive scan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
