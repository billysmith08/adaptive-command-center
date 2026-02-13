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

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const drive = getDriveClient();

    // ── Find Shared Drive → Internal → Command.Center ──
    const sharedDrive = await findSharedDrive(drive);
    if (!sharedDrive) throw new Error('No shared drive found');

    const internalId = await findFolder(drive, sharedDrive.id, 'Internal');
    if (!internalId) throw new Error(`"Internal" folder not found in "${sharedDrive.name}"`);

    const commandCenterId = await findOrCreateFolder(drive, internalId, 'Command.Center');

    // ── Get current state ──
    const { data: state, error: stateErr } = await supabase
      .from('shared_state').select('state, updated_at').eq('id', 'shared').single();
    if (stateErr || !state) throw new Error('Could not read current state');

    const stateJson = JSON.stringify(state.state, null, 2);
    const sizeKb = Math.round(Buffer.byteLength(stateJson) / 1024);

    // ── File name in Pacific time ──
    const now = new Date();
    const pacific = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const dateStr = `${pacific.getFullYear()}-${String(pacific.getMonth() + 1).padStart(2, '0')}-${String(pacific.getDate()).padStart(2, '0')}`;
    const timeStr = `T${String(pacific.getHours()).padStart(2, '0')}-${String(pacific.getMinutes()).padStart(2, '0')}-${String(pacific.getSeconds()).padStart(2, '0')}`;
    const fileName = `backup-${dateStr}${timeStr}.json`;

    // ── Folder structure: Command.Center > Backups > 2026-02 ──
    const backupsFolderId = await findOrCreateFolder(drive, commandCenterId, 'Backups');
    const monthFolder = `${pacific.getFullYear()}-${String(pacific.getMonth() + 1).padStart(2, '0')}`;
    const monthFolderId = await findOrCreateFolder(drive, backupsFolderId, monthFolder);

    // ── Upload ──
    const existing = await drive.files.list({
      q: `'${monthFolderId}' in parents and name = '${fileName}' and trashed=false`,
      fields: 'files(id)', ...SD,
    });

    let fileResult;
    if (existing.data.files?.length > 0) {
      fileResult = await drive.files.update({
        fileId: existing.data.files[0].id,
        media: { mimeType: 'application/json', body: Readable.from([stateJson]) },
        fields: 'id, name, webViewLink', ...SD,
      });
    } else {
      fileResult = await drive.files.create({
        requestBody: { name: fileName, mimeType: 'application/json', parents: [monthFolderId] },
        media: { mimeType: 'application/json', body: Readable.from([stateJson]) },
        fields: 'id, name, webViewLink', ...SD,
      });
    }

    await supabase.from('backup_log').insert({
      backup_type: 'scheduled', file_link: fileResult.data.webViewLink,
      file_name: fileName, state_size_kb: sizeKb, status: 'success',
    });

    // ── Sync contacts as vCards → Command.Center > Contacts ──
    const contacts = state.state.contacts || [];
    let contactsSynced = 0;
    if (contacts.length > 0) {
      const contactsFolderId = await findOrCreateFolder(drive, commandCenterId, 'Contacts');
      for (const c of contacts) {
        if (!c.name) continue;
        const vcf = [
          'BEGIN:VCARD', 'VERSION:3.0',
          `FN:${c.name}`, `N:${c.lastName || ''};${c.firstName || ''};;;`,
          c.email ? `EMAIL;TYPE=WORK:${c.email}` : '',
          c.phone ? `TEL;TYPE=CELL:${c.phone}` : '',
          c.company ? `ORG:${c.company}` : '',
          c.position ? `TITLE:${c.position}` : '',
          c.address ? `ADR;TYPE=WORK:;;${c.address.replace(/,/g, ';')};;;` : '',
          c.notes ? `NOTE:${c.notes.replace(/\n/g, '\\n')}` : '',
          'END:VCARD',
        ].filter(Boolean).join('\r\n');
        const safeName = c.name.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
        const vcfName = `${safeName}.vcf`;
        const existingVcf = await drive.files.list({
          q: `'${contactsFolderId}' in parents and name = '${vcfName.replace(/'/g, "\\'")}' and trashed=false`,
          fields: 'files(id)', ...SD,
        });
        const vcfStream = Readable.from([vcf]);
        if (existingVcf.data.files?.length > 0) {
          await drive.files.update({ fileId: existingVcf.data.files[0].id, media: { mimeType: 'text/vcard', body: vcfStream }, ...SD });
        } else {
          await drive.files.create({ requestBody: { name: vcfName, mimeType: 'text/vcard', parents: [contactsFolderId] }, media: { mimeType: 'text/vcard', body: vcfStream }, fields: 'id', ...SD });
        }
        contactsSynced++;
      }
    }

    console.log(`✅ Backup: ${fileName} (${sizeKb}KB) → ${sharedDrive.name}/Internal/Command.Center/Backups/${monthFolder}/`);
    console.log(`✅ Contacts: ${contactsSynced} vCards → ${sharedDrive.name}/Internal/Command.Center/Contacts/`);

    return NextResponse.json({
      success: true, file: fileName, sizeKb, contactsSynced,
      path: `${sharedDrive.name}/Internal/Command.Center/Backups/${monthFolder}/${fileName}`,
    });
  } catch (error) {
    console.error('Cron backup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
