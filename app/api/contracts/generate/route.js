import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

const SD = { supportsAllDrives: true, includeItemsFromAllDrives: true };

const TEMPLATES = {
  contractor: process.env.CONTRACT_TEMPLATE_CONTRACTOR || '1mXaoWwvp6TipZllStct4mQd1YHn7eM-Z68p2Gw5mlkE',
  vendor: process.env.CONTRACT_TEMPLATE_VENDOR || '12M-PGe2-JZiIip5iMCjyJ_3RBHtLkmBTNyUvCSPsSeI',
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

export async function POST(request) {
  try {
    const body = await request.json();
    if (body.action !== 'generate') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

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

    console.log(`[Contract] Copying template ${templateId} as "${docName}"...`);
    const copy = await drive.files.copy({ fileId: templateId, requestBody: { name: docName }, ...SD });
    const newDocId = copy.data.id;
    console.log(`[Contract] Created doc: ${newDocId}`);

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
    if (requests.length > 0) {
      console.log(`[Contract] Replacing ${requests.length} placeholders...`);
      const result = await docs.documents.batchUpdate({ documentId: newDocId, requestBody: { requests } });
      const replies = result.data.replies || [];
      const totalReplaced = replies.reduce((sum, r) => sum + (r.replaceAllText?.occurrencesChanged || 0), 0);
      console.log(`[Contract] ${totalReplaced} total replacements made across ${replies.length} operations`);
      if (totalReplaced === 0) console.warn('[Contract] WARNING: 0 replacements — template may not contain {{PLACEHOLDER}} markers');
    }

    // 3. Find/create Agreement folder + move doc
    let targetFolderId = null;
    let folderPath = '';
    const sharedDrive = await findSharedDrive(drive);
    const driveId = sharedDrive?.id;

    if (projectFolderId) {
      try {
        const adminId = await findOrCreateFolder(drive, driveId, projectFolderId, 'ADMIN');
        const vendorsId = await findOrCreateFolder(drive, driveId, adminId, 'VENDORS');
        const vendorFolderId = await findOrCreateFolder(drive, driveId, vendorsId, safeName);
        targetFolderId = await findOrCreateFolder(drive, driveId, vendorFolderId, 'Agreement');
        folderPath = `ADMIN/VENDORS/${safeName}/Agreement`;
        console.log(`[Contract] Moving to ${folderPath}`);
        const cur = (await drive.files.get({ fileId: newDocId, fields: 'parents', ...SD })).data.parents || [];
        await drive.files.update({ fileId: newDocId, addParents: targetFolderId, removeParents: cur.join(','), ...SD });
      } catch (e) { console.error('[Contract] Folder error:', e.message); }
    }

    // 4. Export contract as PDF
    let contractPdfUrl = null;
    let contractPdfName = null;
    let combinedPdfUrl = null;
    let combinedPdfName = null;
    let hasInvoiceMerged = false;

    try {
      console.log('[Contract] Exporting as PDF...');
      const pdfRes = await drive.files.export({ fileId: newDocId, mimeType: 'application/pdf' }, { responseType: 'arraybuffer' });
      const contractPdfBytes = Buffer.from(pdfRes.data);
      contractPdfName = `${docName}.pdf`;

      // 5. Try PDF merge if vendor + invoice selected
      const invoiceFileId = invoiceLink ? extractDriveFileId(invoiceLink) : null;

      if (contractType === 'vendor' && invoiceFileId) {
        try {
          console.log(`[Contract] Downloading invoice ${invoiceFileId}...`);
          const invRes = await drive.files.get({ fileId: invoiceFileId, alt: 'media', ...SD }, { responseType: 'arraybuffer' });
          const invoiceBytes = Buffer.from(invRes.data);

          // Dynamic import pdf-lib to handle case where it's not installed
          const { PDFDocument } = await import('pdf-lib');
          console.log('[Contract] Merging PDFs...');

          const merged = await PDFDocument.create();

          // Contract pages
          const contractDoc = await PDFDocument.load(contractPdfBytes);
          const cPages = await merged.copyPages(contractDoc, contractDoc.getPageIndices());
          for (const p of cPages) merged.addPage(p);

          // Separator
          const sep = merged.addPage();
          const { width, height } = sep.getSize();
          sep.drawText('EXHIBIT B', { x: width / 2 - 55, y: height / 2 + 20, size: 26 });
          sep.drawText('Vendor Invoice / Proposal', { x: width / 2 - 95, y: height / 2 - 15, size: 14 });

          // Invoice pages
          try {
            const invoiceDoc = await PDFDocument.load(invoiceBytes);
            const iPages = await merged.copyPages(invoiceDoc, invoiceDoc.getPageIndices());
            for (const p of iPages) merged.addPage(p);
          } catch (imgErr) {
            console.log('[Contract] Invoice not PDF, trying as image...');
            try {
              let img;
              try { img = await merged.embedPng(invoiceBytes); } catch { img = await merged.embedJpg(invoiceBytes); }
              const imgPage = merged.addPage();
              const { width: pw, height: ph } = imgPage.getSize();
              const scale = Math.min(pw / img.width, ph / img.height) * 0.9;
              imgPage.drawImage(img, { x: (pw - img.width * scale) / 2, y: (ph - img.height * scale) / 2, width: img.width * scale, height: img.height * scale });
            } catch { 
              const errPage = merged.addPage();
              errPage.drawText('Invoice could not be embedded. Please attach manually.', { x: 50, y: 500, size: 14 });
            }
          }

          const mergedBytes = await merged.save();
          combinedPdfName = `${docName}_COMBINED.pdf`;
          const parent = targetFolderId || driveId;
          const combinedFile = await drive.files.create({
            requestBody: { name: combinedPdfName, mimeType: 'application/pdf', ...(parent ? { parents: [parent] } : {}) },
            media: { mimeType: 'application/pdf', body: Readable.from([Buffer.from(mergedBytes)]) },
            fields: 'id, name, webViewLink', supportsAllDrives: true,
          });
          combinedPdfUrl = combinedFile.data.webViewLink || `https://drive.google.com/file/d/${combinedFile.data.id}/view`;
          hasInvoiceMerged = true;
          console.log(`[Contract] Combined PDF created: ${combinedPdfName}`);
        } catch (mergeErr) {
          console.error('[Contract] PDF merge failed (will save contract-only PDF):', mergeErr.message);
          // Fall through to save contract-only PDF below
        }
      }

      // If no combined PDF was created, save standalone contract PDF
      if (!combinedPdfUrl) {
        const parent = targetFolderId || driveId;
        const pdfFile = await drive.files.create({
          requestBody: { name: contractPdfName, mimeType: 'application/pdf', ...(parent ? { parents: [parent] } : {}) },
          media: { mimeType: 'application/pdf', body: Readable.from([contractPdfBytes]) },
          fields: 'id, name, webViewLink', supportsAllDrives: true,
        });
        contractPdfUrl = pdfFile.data.webViewLink || `https://drive.google.com/file/d/${pdfFile.data.id}/view`;
        console.log(`[Contract] Standalone PDF saved: ${contractPdfName}`);
      }
    } catch (pdfErr) {
      console.error('[Contract] PDF export failed:', pdfErr.message);
      // Doc was still created successfully — just no PDF
    }

    const docFile = await drive.files.get({ fileId: newDocId, fields: 'id, name, webViewLink', ...SD });

    return NextResponse.json({
      success: true,
      docId: newDocId,
      docName: docFile.data.name,
      docUrl: docFile.data.webViewLink || `https://docs.google.com/document/d/${newDocId}/edit`,
      pdfUrl: combinedPdfUrl || contractPdfUrl,
      pdfName: combinedPdfUrl ? combinedPdfName : contractPdfName,
      folderPath,
      hasCombinedPdf: !!(combinedPdfUrl || contractPdfUrl),
      hasInvoiceMerged,
    });
  } catch (error) {
    console.error('[Contract] Fatal error:', error);
    return NextResponse.json({ error: error.message || 'Contract generation failed' }, { status: 500 });
  }
}
