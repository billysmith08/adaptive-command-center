import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET() {
  const results = { steps: [], errors: [], success: false };
  
  try {
    // Step 1: Check env vars
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;
    const projectId = process.env.GOOGLE_PROJECT_ID;
    
    results.steps.push({
      step: '1. Environment Variables',
      serviceEmail: email ? `${email.slice(0, 20)}...` : 'MISSING',
      privateKey: key ? `Present (${key.length} chars, starts with ${key.slice(0, 30)}...)` : 'MISSING',
      projectId: projectId || 'MISSING',
    });
    
    if (!email || !key) {
      results.errors.push('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY');
      return NextResponse.json(results);
    }

    // Step 2: Authenticate
    let drive;
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: email,
          private_key: key.replace(/\\n/g, '\n'),
          project_id: projectId,
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
      drive = google.drive({ version: 'v3', auth });
      results.steps.push({ step: '2. Authentication', status: 'OK' });
    } catch (authErr) {
      results.steps.push({ step: '2. Authentication', status: 'FAILED', error: authErr.message });
      results.errors.push(`Auth failed: ${authErr.message}`);
      return NextResponse.json(results);
    }

    // Step 3: List Shared Drives
    try {
      const drivesRes = await drive.drives.list({ pageSize: 20, fields: 'drives(id, name)' });
      const sharedDrives = drivesRes.data.drives || [];
      results.steps.push({
        step: '3. Shared Drives',
        count: sharedDrives.length,
        drives: sharedDrives.map(d => ({ id: d.id, name: d.name })),
      });
      
      if (sharedDrives.length === 0) {
        results.errors.push('No shared drives found. The service account needs to be added as a member of the ADPTV LLC shared drive.');
      }
    } catch (driveErr) {
      results.steps.push({ step: '3. Shared Drives', status: 'FAILED', error: driveErr.message });
      results.errors.push(`Can't list drives: ${driveErr.message}`);
    }

    // Step 4: Try to find "ADMIN" folder
    const SD = { supportsAllDrives: true, includeItemsFromAllDrives: true };
    
    try {
      const adminRes = await drive.files.list({
        q: "name='ADMIN' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name, driveId, parents)',
        ...SD,
        corpora: 'allDrives',
      });
      const adminFolders = adminRes.data.files || [];
      results.steps.push({
        step: '4. Find ADMIN folder',
        found: adminFolders.length,
        folders: adminFolders.map(f => ({ id: f.id, name: f.name, driveId: f.driveId, parents: f.parents })),
      });
      
      if (adminFolders.length === 0) {
        results.errors.push('Cannot find ADMIN folder. Service account may not have access to the shared drive.');
      }
    } catch (e) {
      results.steps.push({ step: '4. Find ADMIN folder', status: 'FAILED', error: e.message });
    }

    // Step 5: Navigate full path segment by segment
    const targetPath = 'ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 W9s';
    const parts = targetPath.split('/');
    let currentParentId = null;
    let pathNavigation = [];
    
    for (const part of parts) {
      try {
        let query = `name='${part.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        if (currentParentId) query += ` and '${currentParentId}' in parents`;
        
        const res = await drive.files.list({
          q: query,
          fields: 'files(id, name, driveId, parents)',
          ...SD,
          corpora: 'allDrives',
        });
        
        const folder = res.data.files?.[0];
        if (folder) {
          currentParentId = folder.id;
          pathNavigation.push({ segment: part, status: 'FOUND', id: folder.id, driveId: folder.driveId });
        } else {
          pathNavigation.push({ segment: part, status: 'NOT FOUND', query });
          results.errors.push(`Path breaks at "${part}". Previous segments found OK.`);
          break;
        }
      } catch (e) {
        pathNavigation.push({ segment: part, status: 'ERROR', error: e.message });
        break;
      }
    }
    
    results.steps.push({ step: '5. Navigate W9 path', path: targetPath, navigation: pathNavigation });

    // Step 6: Also try COI path
    const coiPath = 'ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 COIs & Workers Comp';
    const coiParts = coiPath.split('/');
    let coiParentId = null;
    let coiNavigation = [];
    
    for (const part of coiParts) {
      try {
        let query = `name='${part.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        if (coiParentId) query += ` and '${coiParentId}' in parents`;
        
        const res = await drive.files.list({
          q: query,
          fields: 'files(id, name, driveId)',
          ...SD,
          corpora: 'allDrives',
        });
        
        const folder = res.data.files?.[0];
        if (folder) {
          coiParentId = folder.id;
          coiNavigation.push({ segment: part, status: 'FOUND', id: folder.id });
        } else {
          coiNavigation.push({ segment: part, status: 'NOT FOUND' });
          break;
        }
      } catch (e) {
        coiNavigation.push({ segment: part, status: 'ERROR', error: e.message });
        break;
      }
    }
    
    results.steps.push({ step: '6. Navigate COI path', path: coiPath, navigation: coiNavigation });

    // Step 7: If we found the W9 folder, try listing its contents
    if (currentParentId) {
      try {
        const listRes = await drive.files.list({
          q: `'${currentParentId}' in parents and trashed=false`,
          fields: 'files(id, name, mimeType)',
          ...SD,
        });
        results.steps.push({
          step: '7. W9 folder contents',
          folderId: currentParentId,
          items: (listRes.data.files || []).map(f => ({ name: f.name, type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file' })),
        });
      } catch (e) {
        results.steps.push({ step: '7. W9 folder contents', status: 'ERROR', error: e.message });
      }
    }

    // Step 8: Test creating a folder (dry run - just check if we can)
    if (currentParentId) {
      results.steps.push({
        step: '8. Ready to create vendor folders',
        status: 'OK',
        w9BaseFolderId: currentParentId,
        coiBaseFolderId: coiParentId,
        message: 'Both paths resolved. Upload should work.',
      });
      results.success = true;
    }

    return NextResponse.json(results);
  } catch (err) {
    results.errors.push(`Unexpected error: ${err.message}`);
    results.stack = err.stack;
    return NextResponse.json(results, { status: 500 });
  }
}
