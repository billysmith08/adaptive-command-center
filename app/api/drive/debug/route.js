import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SHARED_DRIVE_NAME = 'ADPTV LLC';

export async function GET() {
  const results = { steps: [], ready: false };

  try {
    // Step 1: Check env vars
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY;
    const project = process.env.GOOGLE_PROJECT_ID;
    results.steps.push({
      step: 'env_check',
      email: email ? `${email.slice(0, 20)}...` : 'MISSING',
      keyPresent: !!key,
      keyLength: key?.length || 0,
      project: project || 'MISSING',
    });

    if (!email || !key) {
      results.error = 'Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY';
      return NextResponse.json(results);
    }

    // Step 2: Authenticate
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: key.replace(/\\n/g, '\n'),
        project_id: project,
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const drive = google.drive({ version: 'v3', auth });
    results.steps.push({ step: 'auth', status: 'ok' });

    // Step 3: Find ADPTV LLC shared drive
    const drivesRes = await drive.drives.list({ pageSize: 50 });
    const allDrives = drivesRes.data.drives || [];
    results.steps.push({ step: 'list_drives', count: allDrives.length, drives: allDrives.map(d => ({ name: d.name, id: d.id })) });

    const targetDrive = allDrives.find(d => d.name === SHARED_DRIVE_NAME) || allDrives.find(d => d.name.toLowerCase().includes('adptv'));
    if (!targetDrive) {
      results.error = `Shared drive "${SHARED_DRIVE_NAME}" not found. Service account ${email} must be added as a member of the shared drive.`;
      return NextResponse.json(results);
    }
    const driveId = targetDrive.id;
    results.steps.push({ step: 'find_drive', status: 'found', driveId, driveName: targetDrive.name });

    const SD = { supportsAllDrives: true, includeItemsFromAllDrives: true };

    // Step 4: List root folders
    const rootRes = await drive.files.list({
      q: `'${driveId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      ...SD,
      corpora: 'drive',
      driveId,
      pageSize: 50,
    });
    const rootFolders = (rootRes.data.files || []).map(f => ({ name: f.name, id: f.id }));
    results.steps.push({ step: 'root_folders', count: rootFolders.length, folders: rootFolders });

    // Step 5: Navigate W9 path
    const w9Path = ['ADMIN', 'External Vendors (W9 & Work Comp)', 'Dec 2025 - Dec 2026', '2026 W9s'];
    let parentId = driveId;
    let w9Ok = true;
    for (let i = 0; i < w9Path.length; i++) {
      const seg = w9Path[i];
      const res = await drive.files.list({
        q: `name='${seg.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`,
        fields: 'files(id, name)',
        ...SD,
        corpora: 'drive',
        driveId,
      });
      const folder = res.data.files?.[0];
      if (folder) {
        parentId = folder.id;
        results.steps.push({ step: `w9_path[${i}]`, segment: seg, status: 'found', folderId: folder.id });
      } else {
        // List what's actually there
        const debugRes = await drive.files.list({
          q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: 'files(id, name)',
          ...SD,
          corpora: 'drive',
          driveId,
          pageSize: 50,
        });
        const existing = (debugRes.data.files || []).map(f => f.name);
        results.steps.push({ step: `w9_path[${i}]`, segment: seg, status: 'NOT_FOUND', parentId, existingFolders: existing });
        w9Ok = false;
        break;
      }
    }

    // Step 6: Navigate COI path
    const coiPath = ['ADMIN', 'External Vendors (W9 & Work Comp)', 'Dec 2025 - Dec 2026', '2026 COIs & Workers Comp'];
    parentId = driveId;
    let coiOk = true;
    for (let i = 0; i < coiPath.length; i++) {
      const seg = coiPath[i];
      const res = await drive.files.list({
        q: `name='${seg.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`,
        fields: 'files(id, name)',
        ...SD,
        corpora: 'drive',
        driveId,
      });
      const folder = res.data.files?.[0];
      if (folder) {
        parentId = folder.id;
        results.steps.push({ step: `coi_path[${i}]`, segment: seg, status: 'found', folderId: folder.id });
      } else {
        const debugRes = await drive.files.list({
          q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: 'files(id, name)',
          ...SD,
          corpora: 'drive',
          driveId,
          pageSize: 50,
        });
        const existing = (debugRes.data.files || []).map(f => f.name);
        results.steps.push({ step: `coi_path[${i}]`, segment: seg, status: 'NOT_FOUND', parentId, existingFolders: existing });
        coiOk = false;
        break;
      }
    }

    results.ready = w9Ok && coiOk;
    results.w9Path = w9Ok ? 'OK' : 'BROKEN';
    results.coiPath = coiOk ? 'OK' : 'BROKEN';
    results.summary = results.ready 
      ? '✅ All paths verified. Drive uploads should work.'
      : `❌ Issues found. W9 path: ${results.w9Path}, COI path: ${results.coiPath}. Check folder names match exactly.`;

  } catch (err) {
    results.error = err.message;
    results.stack = err.stack;
  }

  return NextResponse.json(results);
}
