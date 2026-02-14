import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { PDFDocument } from 'pdf-lib';
import { Readable } from 'stream';

const SD = { supportsAllDrives: true, includeItemsFromAllDrives: true };

const TEMPLATES = {
  contractor: process.env.CONTRACT_TEMPLATE_CONTRACTOR || '1Hy2NwUQLq2hHFI3e9MiofycHtIcnSgtq_Pg4fK2TlU8',
  vendor: process.env.CONTRACT_TEMPLATE_VENDOR || '1wH3C1fHI5eArlTf3OEOyVgSA5A9fdMttAatv_a5viGA',
};

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID,
    },
    scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/documents'],
  });
}

async function findOrCreateFolder(drive, driveId, parentId, name) {
  const res = await drive.files.list({
    q: `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`,
    fields: 'files(id, name)', ...SD, ...(driveId ? { corpora: 'drive', driveId } : {}),
  });
  if (res.data.files?.[0]) return res.data.files[0].id;
  const folder = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id', supportsAllDrives: true,
  });
  return folder.data.id;
}

async function findSharedDrive(drive) {
  const res = await drive.drives.list({ pageSize: 50 });
  const drives = res.data.drives || [];
  return drives.find(d => d.name === 'ADPTV LLC') || drives.find(d => d.name.toLowerCase().includes('adptv')) || drives[0];
}

function extractDriveFileId(urlOrId) {
  if (!urlOrId) return null;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(urlOrId)) return urlOrId;
  const m = urlOrId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || urlOrId.match(/[?&]id=([a-zA-Z0-9_-]+)/) || urlOrId.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

async function downloadDriveFile(drive, fileId) {
  const res = await drive.files.get({ fileId, alt: 'media', ...SD }, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

async function exportDocAsPdf(drive, docId) {
  const res = await drive.files.export({ fileId: docId, mimeType: 'application/pdf' }, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

async function mergePdfs(contractPdfBytes, invoicePdfBytes) {
  const merged = await PDFDocument.create();

  // Contract pages
  const contractDoc = await PDFDocument.load(contractPdfBytes);
  const contractPages = await merged.copyPages(contractDoc, contractDoc.getPageIndices());
  for (const page of contractPages) merged.addPage(page);

  // Exhibit B separator page
  const sep = merged.addPage();
  const { width, height } = sep.getSize();
  sep.drawText('EXHIBIT B', { x: width / 2 - 55, y: height / 2 + 20, size: 26 });
  sep.drawText('Vendor Invoice / Proposal', { x: width / 2 - 95, y: height / 2 - 15, size: 14 });

  // Invoice pages
  try {
    const invoiceDoc = await PDFDocument.load(invoicePdfBytes);
    const invoicePages = await merged.copyPages(invoiceDoc, invoiceDoc.getPageIndices());
    for (const page of invoicePages) merged.addPage(page);
  } catch (e) {
    console.error('Invoice not a valid PDF, trying as image:', e.message);
    try {
      let image;
      try { image = await merged.embedPng(invoicePdfBytes); } catch { image = await merged.embedJpg(invoicePdfBytes); }
      const imgPage = merged.addPage();
      const { width: pw, height: ph } = imgPage.getSize();
      const scale = Math.min(pw / image.width, ph / image.height) * 0.9;
      imgPage.drawImage(image, { x: (pw - image.width * scale) / 2, y: (ph - image.height * scale) / 2, width: image.width * scale, height: image.height * scale });
    } catch (imgErr) {
      console.error('Could not embed invoice as image:', imgErr.message);
      const errPage = merged.addPage();
      errPage.drawText('Invoice file could not be embedded. Please attach manually.', { x: 50, y: 500, size: 14 });
    }
  }

  return await merged.save();
}

async function handleGenerate(body) {
  const { contractType, fields, projectFolderId, vendorName, projectCode, invoiceLink } = body;
  if (!contractType || !fields) return NextResponse.json({ error: 'Missing contractType or fields' }, { status: 400 });

  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });

  const templateId = TEMPLATES[contractType];
  if (!templateId) return NextResponse.json({ error: `Unknown contract type: ${contractType}` }, { status: 400 });

  // 1. Copy template
  const safeName = (vendorName || 'Unknown').replace(/[^a-zA-Z0-9 &'()-]/g, '').trim();
  const dateStr = new Date().toISOString().slice(0, 10);
  const typeLabel = contractType === 'contractor' ? 'Contractor' : 'Vendor';
  const docName = `${projectCode || 'CONTRACT'}_${safeName}_${typeLabel}_Agreement_${dateStr}`;

  const copy = await drive.files.copy({ fileId: templateId, requestBody: { name: docName }, ...SD });
  const newDocId = copy.data.id;

  // 2. Replace placeholders
  const requests = [];
  for (const [ph, val] of Object.entries(fields)) {
    if (val && val.trim()) {
      requests.push({ replaceAllText: { containsText: { text: `{{${ph}}}`, matchCase: true }, replaceText: val } });
    }
  }
  const allPH = contractType === 'contractor'
    ? ['EFFECTIVE_DAY','EFFECTIVE_MONTH','EFFECTIVE_YEAR','CONTRACTOR_NAME','CONTRACTOR_ENTITY_TYPE','CONTRACTOR_ADDRESS','CONTRACTOR_EXPERTISE','SOW_TERM','SOW_PROJECT','SOW_COMPENSATION','SOW_PAYMENT_TERMS','SOW_DELIVERABLES','SOW_TIMELINE','SOW_EXECUTION_DATE','AGREEMENT_DATE']
    : ['EFFECTIVE_DAY','EFFECTIVE_MONTH','EFFECTIVE_YEAR','VENDOR_NAME','VENDOR_ENTITY_DESC','VENDOR_TITLE','CLIENT_NAME','EVENT_NAME','EVENT_DATES','EVENT_TIME','VENUE_NAME','VENUE_ADDRESS','VENDOR_DELIVERABLES','PAYMENT_TERMS','TIMELINE'];
  for (const p of allPH) {
    if (!fields[p]) requests.push({ replaceAllText: { containsText: { text: `{{${p}}}`, matchCase: true }, replaceText: '_______________' } });
  }
  if (requests.length > 0) await docs.documents.batchUpdate({ documentId: newDocId, requestBody: { requests } });

  // 3. Find/create Agreements folder
  let targetFolderId = null;
  let folderPath = '';
  const sharedDrive = await findSharedDrive(drive);
  const driveId = sharedDrive?.id;

  if (projectFolderId) {
    try {
      const adminId = await findOrCreateFolder(drive, driveId, projectFolderId, 'ADMIN');
      const vendorsId = await findOrCreateFolder(drive, driveId, adminId, 'VENDORS');
      const vendorFolderId = await findOrCreateFolder(drive, driveId, vendorsId, safeName);
      targetFolderId = await findOrCreateFolder(drive, driveId, vendorFolderId, 'Agreements');
      folderPath = `ADMIN/VENDORS/${safeName}/Agreements`;
    } catch (e) { console.error('Folder nav error:', e.message); }
  }

  // 4. Move Google Doc to Agreements folder
  if (targetFolderId) {
    try {
      const cur = (await drive.files.get({ fileId: newDocId, fields: 'parents', ...SD })).data.parents || [];
      await drive.files.update({ fileId: newDocId, addParents: targetFolderId, removeParents: cur.join(','), ...SD });
    } catch (e) { console.error('Move doc error:', e.message); }
  }

  // 5. Export contract as PDF
  const contractPdfBytes = await exportDocAsPdf(drive, newDocId);

  // 6. Merge with invoice if vendor contract + invoice selected
  let combinedPdfUrl = null;
  let combinedPdfName = null;
  const invoiceFileId = invoiceLink ? extractDriveFileId(invoiceLink) : null;

  if (contractType === 'vendor' && invoiceFileId) {
    try {
      const invoiceBytes = await downloadDriveFile(drive, invoiceFileId);
      const mergedBytes = await mergePdfs(contractPdfBytes, invoiceBytes);

      combinedPdfName = `${docName}_COMBINED.pdf`;
      const parent = targetFolderId || (driveId || undefined);
      const combinedFile = await drive.files.create({
        requestBody: { name: combinedPdfName, mimeType: 'application/pdf', ...(parent ? { parents: [parent] } : {}) },
        media: { mimeType: 'application/pdf', body: Readable.from([Buffer.from(mergedBytes)]) },
        fields: 'id, name, webViewLink', supportsAllDrives: true,
      });
      combinedPdfUrl = combinedFile.data.webViewLink || `https://drive.google.com/file/d/${combinedFile.data.id}/view`;
    } catch (e) { console.error('PDF merge error:', e.message); }
  } else {
    // Save standalone contract PDF too
    try {
      const pdfName = `${docName}.pdf`;
      const parent = targetFolderId || (driveId || undefined);
      const pdfFile = await drive.files.create({
        requestBody: { name: pdfName, mimeType: 'application/pdf', ...(parent ? { parents: [parent] } : {}) },
        media: { mimeType: 'application/pdf', body: Readable.from([contractPdfBytes]) },
        fields: 'id, name, webViewLink', supportsAllDrives: true,
      });
      combinedPdfUrl = pdfFile.data.webViewLink || `https://drive.google.com/file/d/${pdfFile.data.id}/view`;
      combinedPdfName = pdfName;
    } catch (e) { console.error('PDF save error:', e.message); }
  }

  const docFile = await drive.files.get({ fileId: newDocId, fields: 'id, name, webViewLink', ...SD });

  return NextResponse.json({
    success: true,
    docId: newDocId,
    docName: docFile.data.name,
    docUrl: docFile.data.webViewLink || `https://docs.google.com/document/d/${newDocId}/edit`,
    pdfUrl: combinedPdfUrl,
    pdfName: combinedPdfName,
    folderPath,
    hasCombinedPdf: !!combinedPdfUrl,
    hasInvoiceMerged: contractType === 'vendor' && !!invoiceFileId && !!combinedPdfUrl,
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (body.action === 'generate') return handleGenerate(body);
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Contract API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
