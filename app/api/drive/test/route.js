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
  const diagnostics = {
    timestamp: new Date().toISOString(),
    envVars: {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? `✅ Set (${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL})` : "❌ MISSING",
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? `✅ Set (${process.env.GOOGLE_PRIVATE_KEY.length} chars)` : "❌ MISSING",
      GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID ? `✅ Set (${process.env.GOOGLE_PROJECT_ID})` : "❌ MISSING",
    },
    connection: null,
    accessibleFiles: null,
    folderContents: null,
    error: null,
  };

  // Check env vars first
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    diagnostics.error = "Missing required environment variables. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in Vercel.";
    return NextResponse.json(diagnostics);
  }

  try {
    const drive = getDriveClient();
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');
    const testSearch = searchParams.get('testSearch');

    // Test 1: Can we connect at all?
    const about = await drive.about.get({ fields: 'user', supportsAllDrives: true });
    diagnostics.connection = {
      status: "✅ Connected",
      authenticatedAs: about.data.user?.emailAddress || "unknown",
      displayName: about.data.user?.displayName || "Service Account",
    };

    // Test 2: What can the service account see?
    const allFiles = await drive.files.list({
      q: "trashed=false",
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink, parents)', supportsAllDrives: true, includeItemsFromAllDrives: true,
      corpora: 'allDrives',
      orderBy: 'modifiedTime desc',
      pageSize: 30,
    });
    
    const files = allFiles.data.files || [];
    const folders = files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
    const docs = files.filter(f => f.mimeType !== 'application/vnd.google-apps.folder');
    
    diagnostics.accessibleFiles = {
      totalVisible: files.length,
      folders: folders.map(f => ({ name: f.name, id: f.id, link: f.webViewLink })),
      recentFiles: docs.slice(0, 10).map(f => ({ name: f.name, id: f.id, type: f.mimeType, modified: f.modifiedTime, link: f.webViewLink })),
    };

    // Test 3: If a folder ID is provided, list its contents
    if (folderId) {
      try {
        const folderFiles = await drive.files.list({
          q: `'${folderId.replace(/'/g, "\\'")}' in parents and trashed=false`,
          fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          orderBy: 'name',
          pageSize: 50,
        });
        diagnostics.folderContents = {
          folderId,
          count: (folderFiles.data.files || []).length,
          items: (folderFiles.data.files || []).map(f => ({ name: f.name, id: f.id, type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file', link: f.webViewLink })),
        };
      } catch (folderErr) {
        diagnostics.folderContents = {
          folderId,
          error: `Cannot access folder: ${folderErr.message}. Make sure it's shared with the service account.`,
        };
      }
    }

    // Test 4: If a test search is provided, run it (searches ALL accessible files, not scoped to folder)
    if (testSearch) {
      try {
        let searchQuery = `name contains '${testSearch.replace(/'/g, "\\'")}' and trashed=false`;
        const searchResults = await drive.files.list({
          q: searchQuery,
          fields: 'files(id, name, mimeType, modifiedTime, webViewLink, parents)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
          corpora: 'allDrives',
          orderBy: 'modifiedTime desc',
          pageSize: 20,
        });
        // Also try fullText search for deeper matches
        let fullTextFiles = [];
        try {
          const ftResults = await drive.files.list({
            q: `fullText contains '${testSearch.replace(/'/g, "\\'")}' and trashed=false`,
            fields: 'files(id, name, mimeType, modifiedTime, webViewLink, parents)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            corpora: 'allDrives',
            orderBy: 'relevance desc',
            pageSize: 20,
          });
          fullTextFiles = ftResults.data.files || [];
        } catch (e) { /* ignore */ }
        // Merge and dedupe
        const seen = new Set((searchResults.data.files || []).map(f => f.id));
        const merged = [...(searchResults.data.files || [])];
        for (const f of fullTextFiles) { if (!seen.has(f.id)) { merged.push(f); seen.add(f.id); } }
        diagnostics.searchResults = {
          query: testSearch,
          count: merged.length,
          results: merged.map(f => ({ name: f.name, id: f.id, type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file', link: f.webViewLink })),
        };
      } catch (searchErr) {
        diagnostics.searchResults = { query: testSearch, error: searchErr.message };
      }
    }

    return NextResponse.json(diagnostics);
  } catch (error) {
    diagnostics.connection = { status: "❌ Failed" };
    diagnostics.error = error.message;
    return NextResponse.json(diagnostics, { status: 500 });
  }
}
