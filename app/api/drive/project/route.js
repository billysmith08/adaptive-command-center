import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

const SHARED_DRIVE_NAME = 'ADPTV LLC';
const SD = { supportsAllDrives: true, includeItemsFromAllDrives: true };

const DEFAULT_TEMPLATE = [
  { name: 'ADMIN', children: [
    { name: 'BUDGET', children: [
      { name: 'Exports', children: [] },
    ]},
    { name: 'CLIENT DOCS', children: [
      { name: 'Sent to Client', children: [] },
      { name: 'Received from Client', children: [] },
    ]},
    { name: 'VENDORS', children: [] },
  ]},
  { name: 'PRODUCTION', children: [] },
  { name: 'REFERENCE', children: [] },
];

const VENDOR_SUBFOLDER_TEMPLATE = [
  'Agreement', 'COI', 'Invoices', 'Quotes', 'W9'
];

function getDriveClient(readOnly = false) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID,
    },
    scopes: [readOnly ? 'https://www.googleapis.com/auth/drive.readonly' : 'https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
}

async function findSharedDrive(drive) {
  const drivesRes = await drive.drives.list({ pageSize: 50 });
  const allDrives = drivesRes.data.drives || [];
  return allDrives.find(d => d.name === SHARED_DRIVE_NAME)
    || allDrives.find(d => d.name.toLowerCase().includes('adptv'));
}

async function findFolderInParent(drive, driveId, parentId, name) {
  const res = await drive.files.list({
    q: `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`,
    fields: 'files(id, name, webViewLink)',
    ...SD,
    corpora: 'drive',
    driveId,
  });
  return res.data.files?.[0] || null;
}

async function createFolderInParent(drive, parentId, name) {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id, name, webViewLink',
    supportsAllDrives: true,
  });
  return res.data;
}

async function ensureFolder(drive, driveId, parentId, name) {
  const existing = await findFolderInParent(drive, driveId, parentId, name);
  if (existing) return { ...existing, created: false };
  const created = await createFolderInParent(drive, parentId, name);
  return { ...created, created: true };
}

// Recursively create folder template (only in newly created project folders)
// Skip "Vendor Name" placeholder — it's a template example, not a real folder
async function createTemplateRecursive(drive, parentId, template) {
  const results = [];
  for (const item of template) {
    if (item.name.toLowerCase() === 'vendor name') continue;
    const folder = await createFolderInParent(drive, parentId, item.name);
    results.push({ name: item.name, id: folder.id, created: true });
    if (item.children && item.children.length > 0) {
      await createTemplateRecursive(drive, folder.id, item.children);
    }
  }
  return results;
}

// ─── POST: ensure project folder or upload file ───
export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // File upload via FormData
    if (contentType.includes('multipart/form-data')) {
      return handleUpload(request);
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'ensure') {
      return handleEnsure(body);
    }

    if (action === 'scan-vendors') {
      return handleScanVendors(body);
    }

    if (action === 'audit-folders') {
      return handleAuditFolders(body);
    }

    if (action === 'create-vendor-folder') {
      return handleCreateVendorFolder(body);
    }

    if (action === 'share-project') {
      return handleShareProject(body);
    }

    if (action === 'revoke-project-access') {
      return handleRevokeProjectAccess(body);
    }

    if (action === 'list-project-permissions') {
      return handleListProjectPermissions(body);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Drive project error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── GET: browse folder contents ───
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json({ error: 'Missing folderId' }, { status: 400 });
    }

    const drive = getDriveClient(true);
    const sharedDrive = await findSharedDrive(drive);
    if (!sharedDrive) {
      return NextResponse.json({ error: `Shared drive "${SHARED_DRIVE_NAME}" not found` }, { status: 404 });
    }

    // List all items in folder (folders first, then files)
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink, size, iconLink, thumbnailLink)',
      orderBy: 'folder,name',
      pageSize: 200,
      ...SD,
      corpora: 'drive',
      driveId: sharedDrive.id,
    });

    const items = (res.data.files || []).map(f => ({
      id: f.id,
      name: f.name,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
      mimeType: f.mimeType,
      modified: f.modifiedTime,
      link: f.webViewLink,
      size: f.size ? parseInt(f.size) : null,
      icon: f.iconLink,
      thumbnail: f.thumbnailLink,
    }));

    // Sort: folders first (alphabetical), then files (alphabetical)
    items.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ success: true, items, folderId });
  } catch (err) {
    console.error('Drive browse error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Ensure project folder structure ───
async function handleEnsure(body) {
  const { clientName, projectCode, template } = body;

  if (!clientName || !projectCode) {
    return NextResponse.json({ error: 'Missing clientName or projectCode' }, { status: 400 });
  }

  // Extract year from project code (e.g., "26-FRANK-SYBER-PHX" → "2026")
  const yearPrefix = projectCode.match(/^(\d{2})-/)?.[1];
  if (!yearPrefix) {
    return NextResponse.json({ error: `Cannot extract year from project code: ${projectCode}` }, { status: 400 });
  }
  const year = `20${yearPrefix}`;

  const drive = getDriveClient();
  const sharedDrive = await findSharedDrive(drive);
  if (!sharedDrive) {
    return NextResponse.json({ error: `Shared drive "${SHARED_DRIVE_NAME}" not found` }, { status: 404 });
  }

  const driveId = sharedDrive.id;
  const steps = [];

  // Step 1: Find CLIENTS folder
  const clientsFolder = await findFolderInParent(drive, driveId, driveId, 'CLIENTS');
  if (!clientsFolder) {
    return NextResponse.json({ error: 'CLIENTS folder not found in ADPTV LLC shared drive' }, { status: 404 });
  }
  steps.push({ step: 'CLIENTS', id: clientsFolder.id, created: false });

  // Step 2: Ensure client folder
  const clientFolder = await ensureFolder(drive, driveId, clientsFolder.id, clientName);
  steps.push({ step: 'Client', name: clientName, id: clientFolder.id, created: clientFolder.created });

  // Step 3: Ensure year folder
  const yearFolder = await ensureFolder(drive, driveId, clientFolder.id, year);
  steps.push({ step: 'Year', name: year, id: yearFolder.id, created: yearFolder.created });

  // Step 4: Check if project code folder exists
  const existingProject = await findFolderInParent(drive, driveId, yearFolder.id, projectCode);

  if (existingProject) {
    // Folder exists — just link, don't touch contents
    steps.push({ step: 'ProjectCode', name: projectCode, id: existingProject.id, created: false, message: 'Already exists, linked without modification' });
    return NextResponse.json({
      success: true,
      folderId: existingProject.id,
      folderLink: existingProject.webViewLink,
      path: `CLIENTS/${clientName}/${year}/${projectCode}`,
      created: false,
      steps,
    });
  }

  // Step 5: Create project code folder + template
  const projectFolder = await createFolderInParent(drive, yearFolder.id, projectCode);
  steps.push({ step: 'ProjectCode', name: projectCode, id: projectFolder.id, created: true });

  // Step 6: Create template structure inside new project folder
  const folderTemplate = template || DEFAULT_TEMPLATE;
  const templateResults = await createTemplateRecursive(drive, projectFolder.id, folderTemplate);
  steps.push({ step: 'Template', folders: templateResults });

  return NextResponse.json({
    success: true,
    folderId: projectFolder.id,
    folderLink: projectFolder.webViewLink,
    path: `CLIENTS/${clientName}/${year}/${projectCode}`,
    created: true,
    steps,
  });
}

// ─── Upload file to a specific folder ───
async function handleUpload(request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const folderId = formData.get('folderId');

  if (!file || !folderId) {
    return NextResponse.json({ error: 'Missing file or folderId' }, { status: 400 });
  }

  const drive = getDriveClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const res = await drive.files.create({
    requestBody: {
      name: file.name,
      parents: [folderId],
    },
    media: {
      mimeType: file.type || 'application/octet-stream',
      body: Readable.from(buffer),
    },
    fields: 'id, name, webViewLink, mimeType, size, modifiedTime',
    supportsAllDrives: true,
  });

  return NextResponse.json({
    success: true,
    file: {
      id: res.data.id,
      name: res.data.name,
      link: res.data.webViewLink,
      mimeType: res.data.mimeType,
      size: res.data.size ? parseInt(res.data.size) : null,
      modified: res.data.modifiedTime,
    },
  });
}

// ─── Classify a file by name into a doc type ───
function classifyFile(fileName) {
  const lower = fileName.toLowerCase();
  if (/inv|invoice/.test(lower)) return 'invoice';
  if (/w[\-\s]?9/.test(lower)) return 'w9';
  if (/coi|cert.*ins|insurance|workers?\s*comp/.test(lower)) return 'coi';
  if (/contract|agreement|sow|scope/.test(lower)) return 'contract';
  if (/bank|ach|routing|wire/.test(lower)) return 'banking';
  return null; // unclassified
}

// ─── Scan project ADMIN/VENDORS for vendor docs ───
async function handleScanVendors(body) {
  const { projectFolderId } = body;
  if (!projectFolderId) {
    return NextResponse.json({ error: 'Missing projectFolderId' }, { status: 400 });
  }

  // Use write-capable client for cross-copy
  const drive = getDriveClient(false);
  const sharedDrive = await findSharedDrive(drive);
  if (!sharedDrive) {
    return NextResponse.json({ error: `Shared drive "${SHARED_DRIVE_NAME}" not found` }, { status: 404 });
  }
  const driveId = sharedDrive.id;

  const vendors = {};

  // ─── Helper: classify files in a vendor folder ───
  function classifyFiles(files) {
    const docs = {};
    for (const file of files) {
      const docType = classifyFile(file.name);
      if (docType) {
        if (!docs[docType]) {
          docs[docType] = { done: true, file: file.name, link: file.webViewLink, modified: file.modifiedTime, fileId: file.id };
        }
      } else {
        if (!docs.other) docs.other = [];
        docs.other.push({ name: file.name, link: file.webViewLink, fileId: file.id });
      }
    }
    return docs;
  }

  // ─── Helper: list files in a folder ───
  async function listFiles(parentId) {
    const res = await drive.files.list({
      q: `'${parentId}' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'`,
      fields: 'files(id, name, mimeType, webViewLink, modifiedTime)',
      orderBy: 'name', pageSize: 100, ...SD, corpora: 'drive', driveId,
    });
    return res.data.files || [];
  }

  // ─── Helper: list subfolders ───
  async function listSubfolders(parentId) {
    const res = await drive.files.list({
      q: `'${parentId}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id, name, webViewLink)',
      orderBy: 'name', pageSize: 200, ...SD, corpora: 'drive', driveId,
    });
    return res.data.files || [];
  }

  // ─── Helper: copy a file into a target folder ───
  async function copyFileTo(fileId, targetFolderId, fileName) {
    try {
      const copied = await drive.files.copy({
        fileId,
        requestBody: { name: fileName, parents: [targetFolderId] },
        ...SD,
      });
      console.log(`Copied "${fileName}" → folder ${targetFolderId}`);
      return copied.data;
    } catch (e) {
      console.error(`Failed to copy "${fileName}":`, e.message);
      return null;
    }
  }

  // ─── Helper: ensure a subfolder exists inside a parent ───
  async function ensureFolder(parentId, name) {
    const existing = await findFolderInParent(drive, driveId, parentId, name);
    if (existing) return existing;
    const created = await drive.files.create({
      requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
      fields: 'id, name, webViewLink', ...SD,
    });
    return created.data;
  }

  // ═══════════════════════════════════════════════════════
  // PASS 1: Scan project ADMIN/VENDORS (VendorName/DocType structure)
  // Structure: VENDORS / VendorName / {Agreement, COI, Invoices, Quotes, W9}
  // ═══════════════════════════════════════════════════════
  const projAdmin = await findFolderInParent(drive, driveId, projectFolderId, 'ADMIN');
  const projVendorsFolder = projAdmin ? await findFolderInParent(drive, driveId, projAdmin.id, 'VENDORS') : null;

  // Map folder names to compliance keys
  const FOLDER_TO_KEY = {
    'agreement': 'contract',
    'agreements': 'contract',
    'coi': 'coi',
    'invoices': 'invoice',
    'invoice': 'invoice',
    'quotes': 'quote',
    'quote': 'quote',
    'w9': 'w9',
    'w-9': 'w9',
  };

  if (projVendorsFolder) {
    const vendorFolders = await listSubfolders(projVendorsFolder.id);
    for (const vf of vendorFolders) {
      const subfolders = await listSubfolders(vf.id);
      const subNames = subfolders.map(s => s.name.toLowerCase());
      
      // Check if subfolders match known doc-type folders
      const isDocTypeStructure = subNames.some(n => FOLDER_TO_KEY[n] !== undefined);
      
      if (isDocTypeStructure) {
        // New structure: VendorName / {Agreement, COI, Invoices, ...}
        const docs = {};
        let totalFiles = 0;
        for (const sub of subfolders) {
          const docKey = FOLDER_TO_KEY[sub.name.toLowerCase()];
          if (!docKey) continue;
          const files = await listFiles(sub.id);
          totalFiles += files.length;
          if (files.length > 0) {
            // For versioned types (invoice, quote), get latest by modified time
            const sorted = files.sort((a, b) => (b.modifiedTime || '').localeCompare(a.modifiedTime || ''));
            docs[docKey] = { done: true, file: sorted[0].name, link: sorted[0].webViewLink, modified: sorted[0].modifiedTime, fileId: sorted[0].id };
          }
        }
        // Also check for files directly in vendor folder (flat files)
        const directFiles = await listFiles(vf.id);
        if (directFiles.length > 0) {
          const classified = classifyFiles(directFiles);
          for (const [key, val] of Object.entries(classified)) {
            if (key !== 'other' && !docs[key]) docs[key] = val;
          }
          totalFiles += directFiles.length;
        }
        if (totalFiles > 0 || subfolders.length > 0) {
          vendors[vf.name] = { docs, fileCount: totalFiles, folderId: vf.id, projectFolderId: vf.id };
        }
      } else {
        // Legacy flat structure: VendorName / files (no doc-type subfolders)
        const files = await listFiles(vf.id);
        if (files.length > 0) {
          vendors[vf.name] = { docs: classifyFiles(files), fileCount: files.length, folderId: vf.id, projectFolderId: vf.id };
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // PASS 2: Scan global ADMIN → External Vendors (W9 & Work Comp) → latest period → W9s / COIs subfolders
  // ═══════════════════════════════════════════════════════
  let globalComplianceFolder = null;
  let globalW9sFolder = null;
  let globalCOIsFolder = null;
  try {
    const rootAdmin = await findFolderInParent(drive, driveId, driveId, 'ADMIN');
    if (rootAdmin) {
      // Find "External Vendors (W9 & Work Comp)" or similar
      const adminSubs = await listSubfolders(rootAdmin.id);
      const extVendors = adminSubs.find(f => /external.*vendor/i.test(f.name) || /w9.*work.*comp/i.test(f.name));
      if (extVendors) {
        // Find the most recent period folder (e.g. "Dec 2025 - Dec 2026")
        const periods = await listSubfolders(extVendors.id);
        // Sort by name descending to get latest period first
        periods.sort((a, b) => b.name.localeCompare(a.name));
        globalComplianceFolder = periods[0] || null;
        console.log('Global compliance folder:', globalComplianceFolder?.name || 'not found');

        // Find W9s and COIs subfolders inside the period folder
        if (globalComplianceFolder) {
          const periodSubs = await listSubfolders(globalComplianceFolder.id);
          globalW9sFolder = periodSubs.find(f => /w9/i.test(f.name));
          globalCOIsFolder = periodSubs.find(f => /coi|cert.*ins|insurance|workers?\s*comp/i.test(f.name));
          console.log('Global W9s folder:', globalW9sFolder?.name || 'not found');
          console.log('Global COIs folder:', globalCOIsFolder?.name || 'not found');
        }
      }
    }
  } catch (e) {
    console.error('Error finding global compliance folder:', e.message);
  }

  // Scan vendor folders inside each doc-type subfolder
  const globalDocFolders = [
    { folder: globalW9sFolder, docType: 'w9' },
    { folder: globalCOIsFolder, docType: 'coi' },
  ];

  for (const { folder: docFolder, docType } of globalDocFolders) {
    if (!docFolder) continue;
    const vendorFolders = await listSubfolders(docFolder.id);
    for (const gvf of vendorFolders) {
      const files = await listFiles(gvf.id);
      if (files.length === 0) continue;
      const globalDocs = classifyFiles(files);
      // If no classified doc of the expected type, try to use first file as that type
      if (!globalDocs[docType]?.done && files.length > 0) {
        globalDocs[docType] = { done: true, file: files[0].name, link: files[0].webViewLink, modified: files[0].modifiedTime, fileId: files[0].id };
      }

      if (vendors[gvf.name]) {
        // Vendor already found in project — merge if project doesn't have this doc
        if (globalDocs[docType]?.done && !vendors[gvf.name].docs[docType]?.done) {
          vendors[gvf.name].docs[docType] = { ...globalDocs[docType], source: 'global' };
        }
        if (!vendors[gvf.name].globalFolderId) vendors[gvf.name].globalFolderId = {};
        if (typeof vendors[gvf.name].globalFolderId === 'string') {
          vendors[gvf.name].globalFolderId = { [docType]: vendors[gvf.name].globalFolderId };
        }
        vendors[gvf.name].globalFolderId[docType] = gvf.id;
      }
      // Skip vendors that only exist in global — they're not part of this project
    }
  }

  // ═══════════════════════════════════════════════════════
  // PASS 3: Cross-copy W9 and COI between project ↔ global
  // ═══════════════════════════════════════════════════════
  const copyResults = [];
  for (const [vendorName, vdata] of Object.entries(vendors)) {
    for (const docType of ['w9', 'coi']) {
      const doc = vdata.docs[docType];
      if (!doc?.done || !doc.fileId) continue;

      // Determine which global doc-type folder to use
      const globalDocTypeFolder = docType === 'w9' ? globalW9sFolder : globalCOIsFolder;
      const globalVendorFolderId = typeof vdata.globalFolderId === 'object' ? vdata.globalFolderId?.[docType] : vdata.globalFolderId;

      const inProject = vdata.projectFolderId && doc.source !== 'global';
      const inGlobal = globalVendorFolderId && doc.source === 'global';

      // If doc is in project but NOT in global → copy to global (inside correct doc-type subfolder)
      if (inProject && globalDocTypeFolder && !inGlobal) {
        const targetFolder = await ensureFolder(globalDocTypeFolder.id, vendorName);
        // Check if already exists in target
        const existingFiles = await listFiles(targetFolder.id);
        const alreadyThere = existingFiles.some(f => classifyFile(f.name) === docType || f.name === doc.file);
        if (!alreadyThere) {
          const copied = await copyFileTo(doc.fileId, targetFolder.id, doc.file);
          if (copied) copyResults.push({ vendor: vendorName, doc: docType, direction: 'project→global' });
        }
        if (!vdata.globalFolderId) vendors[vendorName].globalFolderId = {};
        if (typeof vendors[vendorName].globalFolderId === 'string') {
          vendors[vendorName].globalFolderId = { [docType]: vendors[vendorName].globalFolderId };
        }
        if (typeof vendors[vendorName].globalFolderId === 'object') {
          vendors[vendorName].globalFolderId[docType] = targetFolder.id;
        }
      }

      // If doc is in global but NOT in project → copy to project vendor folder
      if (inGlobal && vdata.projectFolderId) {
        const existingFiles = await listFiles(vdata.projectFolderId);
        const alreadyThere = existingFiles.some(f => classifyFile(f.name) === docType || f.name === doc.file);
        if (!alreadyThere) {
          const copied = await copyFileTo(doc.fileId, vdata.projectFolderId, doc.file);
          if (copied) copyResults.push({ vendor: vendorName, doc: docType, direction: 'global→project' });
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    vendors,
    vendorCount: Object.keys(vendors).length,
    copyResults,
    globalComplianceFolder: globalComplianceFolder?.name || null,
    scannedAt: new Date().toISOString(),
  });
}

// ─── Audit & fix existing project folders ───
async function handleAuditFolders(body) {
  const { dryRun = true } = body; // default to dry run (report only)
  const drive = getDriveClient();
  const sharedDrive = await findSharedDrive(drive);
  if (!sharedDrive) {
    return NextResponse.json({ error: 'Shared drive not found' }, { status: 404 });
  }
  const driveId = sharedDrive.id;

  // Required template structure (flat paths for easy checking)
  const REQUIRED = DEFAULT_TEMPLATE;

  // Helper: list all subfolders of a parent
  async function listSubfolders(parentId) {
    let all = [], pageToken = null;
    do {
      const res = await drive.files.list({
        q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'nextPageToken, files(id, name)',
        ...SD, corpora: 'drive', driveId,
        pageSize: 200,
        ...(pageToken ? { pageToken } : {}),
      });
      all.push(...(res.data.files || []));
      pageToken = res.data.nextPageToken;
    } while (pageToken);
    return all;
  }

  // Recursively ensure template exists under a parent, return report
  async function auditRecursive(parentId, template) {
    const existing = await listSubfolders(parentId);
    const existingMap = new Map(existing.map(f => [f.name.toUpperCase(), f]));
    const report = [];

    for (const item of template) {
      if (item.name.toLowerCase() === 'vendor name') continue;
      const match = existingMap.get(item.name.toUpperCase());
      if (match) {
        const childReport = (item.children && item.children.length > 0)
          ? await auditRecursive(match.id, item.children)
          : [];
        report.push({ name: item.name, status: 'exists', id: match.id, children: childReport });
      } else {
        // Missing! Create if not dry run
        if (!dryRun) {
          const created = await createFolderInParent(drive, parentId, item.name);
          let childReport = [];
          if (item.children && item.children.length > 0) {
            childReport = await auditRecursive(created.id, item.children);
          }
          report.push({ name: item.name, status: 'created', id: created.id, children: childReport });
        } else {
          // Just report missing (and all children would also be missing)
          function markMissing(items) {
            return items.map(i => ({ name: i.name, status: 'missing', children: markMissing(i.children || []) }));
          }
          report.push({ name: item.name, status: 'missing', children: markMissing(item.children || []) });
        }
      }
    }
    return report;
  }

  // Find CLIENTS folder
  const clientsFolder = await findFolderInParent(drive, driveId, driveId, 'CLIENTS');
  if (!clientsFolder) {
    return NextResponse.json({ error: 'CLIENTS folder not found' }, { status: 404 });
  }

  // Iterate: CLIENTS → [Client] → [Year] → [Project]
  const clientFolders = await listSubfolders(clientsFolder.id);
  const results = [];

  for (const client of clientFolders) {
    const yearFolders = await listSubfolders(client.id);
    for (const year of yearFolders) {
      // Only process year-like folders (4 digits)
      if (!/^\d{4}$/.test(year.name)) continue;
      const projectFolders = await listSubfolders(year.id);
      for (const project of projectFolders) {
        const audit = await auditRecursive(project.id, REQUIRED);
        const hasMissing = JSON.stringify(audit).includes('"missing"') || JSON.stringify(audit).includes('"created"');
        results.push({
          client: client.name,
          year: year.name,
          project: project.name,
          projectId: project.id,
          audit,
          needsFix: hasMissing,
        });
      }
    }
  }

  const needsFix = results.filter(r => r.needsFix);
  const ok = results.filter(r => !r.needsFix);

  return NextResponse.json({
    success: true,
    dryRun,
    totalProjects: results.length,
    compliant: ok.length,
    needsFix: needsFix.length,
    projects: results,
  });
}

// ─── Create vendor subfolder inside project's ADMIN/VENDORS/ ───
async function handleCreateVendorFolder(body) {
  const { projectFolderId, vendorName } = body;
  if (!projectFolderId || !vendorName) {
    return NextResponse.json({ error: 'Missing projectFolderId or vendorName' }, { status: 400 });
  }

  const drive = getDriveClient();
  const sharedDrive = await findSharedDrive(drive);
  if (!sharedDrive) {
    return NextResponse.json({ error: 'Shared drive not found' }, { status: 404 });
  }
  const driveId = sharedDrive.id;

  // Helper to find or create a folder
  async function findOrCreate(parentId, name) {
    const existing = await findFolderInParent(drive, driveId, parentId, name);
    if (existing) return { id: existing.id, created: false };
    const created = await createFolderInParent(drive, parentId, name);
    return { id: created.id, created: true };
  }

  try {
    // Ensure ADMIN exists
    const admin = await findOrCreate(projectFolderId, 'ADMIN');
    // Ensure VENDORS exists inside ADMIN
    const vendors = await findOrCreate(admin.id, 'VENDORS');
    // Check if vendor folder already exists
    const existingVendor = await findFolderInParent(drive, driveId, vendors.id, vendorName);
    if (existingVendor) {
      return NextResponse.json({
        success: true,
        vendorFolderId: existingVendor.id,
        created: false,
        message: `Vendor folder "${vendorName}" already exists`,
      });
    }
    // Create vendor folder
    const vendorFolder = await createFolderInParent(drive, vendors.id, vendorName);
    // Create subfolders from template
    const subfolders = [];
    for (const sub of VENDOR_SUBFOLDER_TEMPLATE) {
      const sf = await createFolderInParent(drive, vendorFolder.id, sub);
      subfolders.push({ name: sub, id: sf.id });
    }

    return NextResponse.json({
      success: true,
      vendorFolderId: vendorFolder.id,
      created: true,
      subfolders,
      message: `Created vendor folder "${vendorName}" with ${subfolders.length} subfolders`,
    });
  } catch (err) {
    console.error('Create vendor folder error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Share project folder with external user (Option A permissions) ───
async function handleShareProject(body) {
  const { projectFolderId, email, role = 'reader', projectName } = body;
  if (!projectFolderId || !email) {
    return NextResponse.json({ error: 'Missing projectFolderId or email' }, { status: 400 });
  }

  const drive = getDriveClient();

  try {
    // Share the project folder with the user
    const permission = await drive.permissions.create({
      fileId: projectFolderId,
      requestBody: {
        type: 'user',
        role, // 'reader', 'commenter', or 'writer'
        emailAddress: email,
      },
      sendNotificationEmail: true,
      emailMessage: projectName
        ? `You've been added to the "${projectName}" project in Command Center. This gives you access to the project's Drive folder.`
        : `You've been given access to a project folder in Command Center.`,
      supportsAllDrives: true,
    });

    return NextResponse.json({
      success: true,
      permissionId: permission.data.id,
      email,
      role,
      message: `Shared "${projectName || projectFolderId}" with ${email} as ${role}`,
    });
  } catch (err) {
    // Handle "already has access" gracefully
    if (err.message?.includes('already has access')) {
      return NextResponse.json({ success: true, alreadyShared: true, email, role, message: `${email} already has access` });
    }
    console.error('Share project error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Revoke project folder access ───
async function handleRevokeProjectAccess(body) {
  const { projectFolderId, email } = body;
  if (!projectFolderId || !email) {
    return NextResponse.json({ error: 'Missing projectFolderId or email' }, { status: 400 });
  }

  const drive = getDriveClient();

  try {
    // List permissions to find the one for this email
    const perms = await drive.permissions.list({
      fileId: projectFolderId,
      fields: 'permissions(id, emailAddress, role, type)',
      supportsAllDrives: true,
    });

    const userPerm = (perms.data.permissions || []).find(
      p => p.emailAddress?.toLowerCase() === email.toLowerCase() && p.type === 'user'
    );

    if (!userPerm) {
      return NextResponse.json({ success: true, message: `${email} did not have access`, notFound: true });
    }

    await drive.permissions.delete({
      fileId: projectFolderId,
      permissionId: userPerm.id,
      supportsAllDrives: true,
    });

    return NextResponse.json({
      success: true,
      email,
      revoked: true,
      message: `Revoked ${email}'s access`,
    });
  } catch (err) {
    console.error('Revoke access error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── List who has access to a project folder ───
async function handleListProjectPermissions(body) {
  const { projectFolderId } = body;
  if (!projectFolderId) {
    return NextResponse.json({ error: 'Missing projectFolderId' }, { status: 400 });
  }

  const drive = getDriveClient();

  try {
    const perms = await drive.permissions.list({
      fileId: projectFolderId,
      fields: 'permissions(id, emailAddress, role, type, displayName)',
      supportsAllDrives: true,
    });

    const users = (perms.data.permissions || [])
      .filter(p => p.type === 'user')
      .map(p => ({
        id: p.id,
        email: p.emailAddress,
        name: p.displayName,
        role: p.role,
      }));

    return NextResponse.json({ success: true, permissions: users });
  } catch (err) {
    console.error('List permissions error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
