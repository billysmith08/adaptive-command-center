import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
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

async function findFolder(drive, parentId, name) {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)', ...SD,
  });
  return res.data.files?.[0]?.id || null;
}

async function findOrCreateFolder(drive, parentId, name) {
  const existing = await findFolder(drive, parentId, name);
  if (existing) return existing;
  const folder = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id', ...SD,
  });
  return folder.data.id;
}

async function findSharedDrive(drive) {
  const res = await drive.drives.list({ pageSize: 20, fields: 'drives(id, name)' });
  const drives = res.data.drives || [];
  const adptv = drives.find(d => d.name.toLowerCase().includes('weareadptv') || d.name.toLowerCase().includes('adptv'));
  return adptv || drives[0] || null;
}

async function getCommandCenterFolder(drive) {
  const sharedDrive = await findSharedDrive(drive);
  if (!sharedDrive) throw new Error('No shared drive found. Ensure service account has access.');
  const internalId = await findFolder(drive, sharedDrive.id, 'Internal');
  if (!internalId) throw new Error(`"Internal" folder not found in "${sharedDrive.name}"`);
  const ccId = await findOrCreateFolder(drive, internalId, 'Command.Center');
  return { ccId, driveName: sharedDrive.name };
}

export async function POST(request) {
  try {
    const { action, versionId } = await request.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // ── RESTORE from version history ──
    if (action === 'restore' && versionId) {
      const { data: snapshot, error: snapErr } = await supabase
        .from('shared_state_history').select('state, saved_at').eq('id', versionId).single();
      if (snapErr || !snapshot) return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });

      const { data: current } = await supabase.from('shared_state').select('state').eq('id', 'shared').single();
      if (current) {
        await supabase.from('shared_state_history').insert({
          state: current.state, save_reason: 'pre-restore',
          change_summary: `Pre-restore snapshot before rolling back to ${snapshot.saved_at}`,
        });
      }

      const { error: restoreErr } = await supabase
        .from('shared_state').update({ state: snapshot.state, updated_at: new Date().toISOString() }).eq('id', 'shared');
      if (restoreErr) throw restoreErr;

      return NextResponse.json({ success: true, restoredFrom: snapshot.saved_at });
    }

    // ── VERSION HISTORY ──
    if (action === 'history') {
      const { data: history, error } = await supabase
        .from('shared_state_history')
        .select('id, saved_at, saved_by, save_reason, change_summary')
        .order('saved_at', { ascending: false }).limit(50);
      if (error) throw error;
      return NextResponse.json({ history: history || [] });
    }

    // ── MANUAL BACKUP to Drive ──
    if (action === 'backup') {
      const { data: state, error: stateErr } = await supabase
        .from('shared_state').select('state, updated_at').eq('id', 'shared').single();
      if (stateErr || !state) throw new Error('Could not read current state');

      const stateJson = JSON.stringify(state.state, null, 2);
      const sizeKb = Math.round(Buffer.byteLength(stateJson) / 1024);
      const now = new Date();
      const fileName = `backup-manual-${now.toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;

      const drive = getDriveClient();
      const { ccId, driveName } = await getCommandCenterFolder(drive);
      const backupsFolderId = await findOrCreateFolder(drive, ccId, 'Backups');
      const monthFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const monthFolderId = await findOrCreateFolder(drive, backupsFolderId, monthFolder);

      const file = await drive.files.create({
        requestBody: { name: fileName, mimeType: 'application/json', parents: [monthFolderId] },
        media: { mimeType: 'application/json', body: Readable.from([stateJson]) },
        fields: 'id, name, webViewLink', ...SD,
      });

      await supabase.from('backup_log').insert({
        backup_type: 'manual', file_link: file.data.webViewLink,
        file_name: fileName, state_size_kb: sizeKb, status: 'success',
      });

      return NextResponse.json({
        success: true,
        file: { name: fileName, link: file.data.webViewLink, sizeKb },
        path: `${driveName}/Internal/Command.Center/Backups/${monthFolder}/${fileName}`,
      });
    }

    // ── SYNC CONTACTS as vCards ──
    if (action === 'sync-contacts') {
      const { data: state, error: stateErr } = await supabase
        .from('shared_state').select('state').eq('id', 'shared').single();
      if (stateErr || !state) throw new Error('Could not read state');

      const contacts = state.state.contacts || [];
      if (!contacts.length) return NextResponse.json({ success: true, synced: 0 });

      const drive = getDriveClient();
      const { ccId, driveName } = await getCommandCenterFolder(drive);
      const contactsFolderId = await findOrCreateFolder(drive, ccId, 'Contacts');

      let synced = 0;
      for (const c of contacts) {
        if (!c.name) continue;
        const vcf = [
          'BEGIN:VCARD', 'VERSION:3.0',
          `FN:${c.name}`, `N:${c.lastName || ''};${c.firstName || ''};;;`,
          c.email ? `EMAIL;TYPE=WORK:${c.email}` : '',
          c.phone ? `TEL;TYPE=CELL:${c.phone}` : '',
          c.company ? `ORG:${c.company}` : '',
          c.position ? `TITLE:${c.position}` : '',
          c.notes ? `NOTE:${c.notes.replace(/\n/g, '\\n')}` : '',
          'END:VCARD',
        ].filter(Boolean).join('\r\n');

        const safeName = c.name.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
        const vcfName = `${safeName}.vcf`;
        const existing = await drive.files.list({
          q: `'${contactsFolderId}' in parents and name = '${vcfName.replace(/'/g, "\\'")}' and trashed=false`,
          fields: 'files(id)', ...SD,
        });
        const stream = Readable.from([vcf]);
        if (existing.data.files?.length > 0) {
          await drive.files.update({ fileId: existing.data.files[0].id, media: { mimeType: 'text/vcard', body: stream }, ...SD });
        } else {
          await drive.files.create({ requestBody: { name: vcfName, mimeType: 'text/vcard', parents: [contactsFolderId] }, media: { mimeType: 'text/vcard', body: stream }, fields: 'id', ...SD });
        }
        synced++;
      }

      return NextResponse.json({ success: true, synced, path: `${driveName}/Internal/Command.Center/Contacts/` });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
