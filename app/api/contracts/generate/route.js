import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

const SD = { supportsAllDrives: true, includeItemsFromAllDrives: true };
const SHARED_DRIVE_NAME = 'ADPTV LLC';

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
  return drives.find(d => d.name === SHARED_DRIVE_NAME) || drives.find(d => d.name.toLowerCase().includes('adptv')) || drives[0];
}

function extractDriveFileId(urlOrId) {
  if (!urlOrId) return null;
  if (/^[a-zA-Z0-9_-]{20,}$/.test(urlOrId)) return urlOrId;
  const m = urlOrId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || urlOrId.match(/[?&]id=([a-zA-Z0-9_-]+)/) || urlOrId.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

// ═══ VENDOR AGREEMENT TEMPLATE ═══
const VENDOR_TPL = `VENDOR AGREEMENT

THIS VENDOR AGREEMENT ("Agreement") is made and entered into this {{EFFECTIVE_DAY}} day of {{EFFECTIVE_MONTH}}, 20{{EFFECTIVE_YEAR}} ("Effective Date"), by and between WE ARE ADPTV LLC, a California limited liability company ("ADPTV"), and {{VENDOR_NAME}}, {{VENDOR_ENTITY_DESC}} ("Vendor") (each a "Party" and collectively, the "Parties"). ADPTV hereby engages Vendor, and Vendor hereby agrees to furnish vendor services pursuant to the terms and conditions as follows:

1. Services. ADPTV has engaged the Vendor to render services as more particularly described in Exhibit A and Vendor's proposal/quote/invoice/budget attached hereto as Exhibit B (if applicable) in the Vendor's capacity as {{VENDOR_TITLE}} ("Services") in connection with the Event specified in Exhibit A. The Services shall be performed on the dates and times as specified by ADPTV. The Vendor agrees to perform the Services in a professional manner to the best of its ability and consistent with commercially reasonable instructions received from ADPTV. ADPTV reserves the right to make changes to the Services upon reasonable notice to Vendor. In the event of a conflict between the terms found in Exhibit A and the terms found within the body of this Agreement, the terms in Exhibit A shall control.

2. Consideration. As full compensation for the Services rendered hereunder, subject to Vendor's satisfactory performance of the Services (in ADPTV's sole and absolute discretion) and delivery and approval by ADPTV of all invoices, ADPTV (or ADPTV's client, as applicable) agrees to pay the Vendor within fifteen (15) days of the Event, in accordance with the proposal/quote/invoice/budget attached hereto and incorporated herein by reference as Exhibit B or as otherwise mutually agreed upon by the Parties (the "Fee"). Notwithstanding any other provision in this Agreement to the contrary, no compensation shall accrue or become payable to the Vendor in the event that the Vendor is unable, unwilling or otherwise fails to perform the Services contracted for herein. Furthermore, the Vendor acknowledges and agrees that the Vendor shall not incur any reimbursable expenses without ADPTV's prior written approval.

3. Term. The term of this Agreement shall commence on the Effective Date and continue until the later of (i) Vendor's satisfactory performance of the Services or (ii) the completion of the Event.

4. Suspension; Termination.
a. Termination. ADPTV shall have the right to terminate this Agreement at any time and without prior notice, with or without cause, except to pay any undisputed Fees earned and unpaid as of the date of termination.
b. Force Majeure. Upon the occurrence of an act of God event (including but not limited to fire, flood, hurricane, pandemic, or declaration of a public health emergency), the obligations under this Agreement shall be suspended until further notice by ADPTV.

5. Independent Contractor Status. The relationship of the Vendor to ADPTV shall be that of an independent contractor. Vendor shall be responsible for all taxes, withholdings, and insurance required by law.

6. Subcontractors/Employees. Vendor assumes full responsibility for its employees, agents, or subcontractors. Vendor shall cause them to be bound by this Agreement and indemnifies ADPTV for their acts or omissions.

7. Representations and Warranties. Vendor represents it has full authority to enter this Agreement, the Services will not breach any other agreement, and all materials will be original and non-infringing.

8. Indemnification. Vendor shall indemnify and hold harmless ADPTV, its clients, affiliates, successors, and their respective officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses arising from the Services or any breach by Vendor.

9. Intellectual Property.
a. Ownership. ADPTV or its client retains all right, title and interest in its intellectual property. Vendor shall not use any Intellectual Property without prior written authorization.
b. Work for Hire. All Work Product constitutes "work made for hire" and is the sole property of ADPTV or its client.

10. Confidentiality. Vendor shall keep confidential all information relating to ADPTV, its client, and the Event, including operations, finances, trade secrets, and contract terms.

11. Insurance. Vendor shall maintain general liability insurance of at least $1,000,000 per occurrence and $2,000,000 aggregate, naming "WE ARE ADPTV, LLC" as additional insured.

12. Name and Likeness. Vendor grants ADPTV the right to use Vendor's name and biography in connection with the Event.

13. Health Waiver. Vendor acknowledges inherent risk of viral exposure at events and releases ADPTV from any related claims.

14. LIMITATION OF LIABILITY. VENDOR ASSUMES ALL RISKS ASSOCIATED WITH PROVIDING SERVICES. IN NO EVENT WILL ADPTV BE LIABLE FOR CONSEQUENTIAL, SPECIAL, INCIDENTAL, OR PUNITIVE DAMAGES. VENDOR'S RECOVERY SHALL NOT EXCEED THE TOTAL AMOUNT PAID BY ADPTV TO VENDOR.

15. Miscellaneous.
a. Dispute Resolution. Any dispute shall be resolved by binding arbitration per AAA rules in Los Angeles County, California.
b. Remedies. All remedies shall be cumulative. Vendor's sole remedy for ADPTV breach shall be monetary damages.
c. Survival. Sections 5-12 shall survive termination.
d. Integration. This Agreement is the entire agreement and supersedes all prior agreements.
e. Assignment. ADPTV may assign; Vendor may not without written consent.
f. Compliance with Laws. Vendor will comply with all applicable laws and regulations.

In witness whereof, the Parties have executed this Agreement as of the Effective Date.

ADPTV:\t\t\t\t\t\tVENDOR:
WE ARE ADPTV, LLC\t\t\t\t{{VENDOR_NAME}}

By: ___________________\t\t\t\tBy: ___________________
Print: _________________\t\t\t\tPrint: _________________
Title: _________________\t\t\t\tTitle: _________________
Date: _________________\t\t\t\tDate: _________________


EXHIBIT A — SCOPE OF SERVICES

Client Name:\t\t{{CLIENT_NAME}}
Event Name:\t\t{{EVENT_NAME}}
Event Date(s):\t\t{{EVENT_DATES}}
Event Time:\t\t{{EVENT_TIME}}
Venue:\t\t\t{{VENUE_NAME}}
Venue Address:\t\t{{VENUE_ADDRESS}}
Vendor Deliverables:\t{{VENDOR_DELIVERABLES}}
Payment Terms:\t\t{{PAYMENT_TERMS}}
Timeline:\t\t{{TIMELINE}}


Exhibit B — Vendor Invoice / Proposal
(See attached)`;

// ═══ CONTRACTOR AGREEMENT TEMPLATE ═══
const CONTRACTOR_TPL = `INDEPENDENT CONTRACTOR AGREEMENT

THIS INDEPENDENT CONTRACTOR AGREEMENT ("Agreement") is made and entered into this {{EFFECTIVE_DAY}} day of {{EFFECTIVE_MONTH}}, 20{{EFFECTIVE_YEAR}} ("Effective Date"), by and between WE ARE ADPTV LLC, a California limited liability company ("ADPTV"), and {{CONTRACTOR_NAME}}, {{CONTRACTOR_ENTITY_TYPE}} ("Contractor") (each a "Party" and collectively, the "Parties").

1. Engagement. ADPTV hereby engages Contractor to perform the services described in the Statement of Work attached hereto as Exhibit A (the "Services"). Contractor accepts such engagement and agrees to perform the Services in a professional manner consistent with industry standards.

2. Independent Contractor Status. Contractor is an independent contractor and not an employee, partner, agent, or joint venturer of ADPTV. Contractor shall be solely responsible for all taxes, insurance, and other obligations arising from this Agreement.

3. Compensation. As full consideration for the Services, ADPTV agrees to pay Contractor the compensation set forth in Exhibit A. No additional compensation shall be paid without prior written approval from ADPTV.

4. Term and Termination. The term shall be as specified in Exhibit A. Either Party may terminate upon thirty (30) days written notice. ADPTV may terminate immediately for cause.

5. Confidentiality. Contractor shall maintain in confidence all proprietary and confidential information of ADPTV and its clients. This obligation survives termination.

6. Intellectual Property. All work product and deliverables created by Contractor shall be the sole property of ADPTV as "work made for hire." To the extent any work product does not qualify, Contractor hereby assigns all rights to ADPTV.

7. Representations and Warranties. Contractor represents it has authority to enter this Agreement, the Services will be original, non-infringing, and Contractor will comply with all applicable laws.

8. Indemnification. Contractor shall indemnify and hold harmless ADPTV, its clients, officers, directors, employees, and agents from any claims arising from Contractor's performance or breach.

9. Insurance. Contractor shall maintain general liability insurance of at least $1,000,000 per occurrence, naming "WE ARE ADPTV, LLC" as additional insured upon request.

10. Limitation of Liability. IN NO EVENT SHALL ADPTV BE LIABLE FOR CONSEQUENTIAL, SPECIAL, INCIDENTAL, OR PUNITIVE DAMAGES. TOTAL LIABILITY SHALL NOT EXCEED AMOUNTS PAID TO CONTRACTOR.

11. Non-Solicitation. During the term and for twelve (12) months thereafter, Contractor shall not directly solicit any client of ADPTV for competitive services.

12. Dispute Resolution. Any dispute shall be resolved by binding arbitration in Los Angeles County, California, per AAA rules.

13. Miscellaneous.
a. Entire Agreement. This is the entire agreement and supersedes all prior agreements.
b. Amendment. Only by writing signed by both Parties.
c. Assignment. Contractor may not assign without ADPTV's written consent.
d. Governing Law. State of California.
e. Survival. Sections 5-8, 10-12 shall survive termination.

In witness whereof, the Parties have executed this Agreement as of the Effective Date.

ADPTV:\t\t\t\t\t\tCONTRACTOR:
WE ARE ADPTV, LLC\t\t\t\t{{CONTRACTOR_NAME}}

By: ___________________\t\t\t\tBy: ___________________
Print: _________________\t\t\t\tPrint: _________________
Title: _________________\t\t\t\tTitle: _________________
Date: {{AGREEMENT_DATE}}\t\t\t\tDate: _________________


EXHIBIT A — STATEMENT OF WORK

Contractor Name:\t{{CONTRACTOR_NAME}}
Contractor Address:\t{{CONTRACTOR_ADDRESS}}
Field of Expertise:\t{{CONTRACTOR_EXPERTISE}}

Term:\t\t\t{{SOW_TERM}}
Project Description:\t{{SOW_PROJECT}}
Compensation / Fee:\t{{SOW_COMPENSATION}}
Payment Terms:\t\t{{SOW_PAYMENT_TERMS}}
Deliverables:\t\t{{SOW_DELIVERABLES}}
Timeline:\t\t{{SOW_TIMELINE}}

Execution Date: {{SOW_EXECUTION_DATE}}


Exhibit B — Contractor Invoice / Proposal
(See attached)`;


export async function POST(request) {
  try {
    const body = await request.json();
    if (body.action === 'bootstrap-templates') return handleBootstrap();
    if (body.action === 'list-templates') return handleListTemplates();
    if (body.action === 'generate') return handleGenerate(body);
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[Contract] Fatal error:', error);
    return NextResponse.json({ error: error.message || 'Contract generation failed' }, { status: 500 });
  }
}

// ─── BOOTSTRAP: Create template docs on shared drive ───
async function handleBootstrap() {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });
  const sd = await findSharedDrive(drive);
  if (!sd) return NextResponse.json({ error: 'Shared drive not found' }, { status: 404 });
  const folderId = await findOrCreateFolder(drive, sd.id, sd.id, 'TEMPLATES');
  const results = {};

  for (const [type, content] of [['contractor', CONTRACTOR_TPL], ['vendor', VENDOR_TPL]]) {
    const docName = `CC_Template_${type === 'contractor' ? 'Contractor' : 'Vendor'}_Agreement`;
    const existing = await drive.files.list({
      q: `name='${docName}' and '${folderId}' in parents and trashed=false and mimeType='application/vnd.google-apps.document'`,
      fields: 'files(id, name, webViewLink)', ...SD, corpora: 'drive', driveId: sd.id,
    });
    if (existing.data.files?.[0]) {
      results[type] = { id: existing.data.files[0].id, name: existing.data.files[0].name, url: existing.data.files[0].webViewLink, status: 'exists' };
      continue;
    }
    const doc = await drive.files.create({
      requestBody: { name: docName, mimeType: 'application/vnd.google-apps.document', parents: [folderId] },
      fields: 'id, name, webViewLink', supportsAllDrives: true,
    });
    await docs.documents.batchUpdate({
      documentId: doc.data.id,
      requestBody: { requests: [{ insertText: { location: { index: 1 }, text: content } }] },
    });
    results[type] = { id: doc.data.id, name: doc.data.name, url: doc.data.webViewLink, status: 'created' };
    console.log(`[Templates] Created ${type}: ${doc.data.id}`);
  }
  return NextResponse.json({ success: true, templates: results, folderId });
}

// ─── LIST: Find existing template docs ───
async function handleListTemplates() {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });
  const sd = await findSharedDrive(drive);
  if (!sd) return NextResponse.json({ error: 'Shared drive not found' }, { status: 404 });
  const res = await drive.files.list({
    q: `name contains 'CC_Template_' and trashed=false and mimeType='application/vnd.google-apps.document'`,
    fields: 'files(id, name, webViewLink, modifiedTime)', ...SD, corpora: 'drive', driveId: sd.id, pageSize: 50,
  });
  const templates = {};
  for (const f of (res.data.files || [])) {
    if (f.name.includes('Contractor')) templates.contractor = { id: f.id, name: f.name, url: f.webViewLink, modified: f.modifiedTime };
    if (f.name.includes('Vendor')) templates.vendor = { id: f.id, name: f.name, url: f.webViewLink, modified: f.modifiedTime };
  }
  return NextResponse.json({ success: true, templates });
}

// ─── GENERATE: Create contract from template ───
async function handleGenerate(body) {
  const { contractType, fields, projectFolderId, vendorName, projectCode, invoiceLink, templateId: overrideId } = body;
  if (!contractType || !fields) return NextResponse.json({ error: 'Missing contractType or fields' }, { status: 400 });

  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });

  let templateId = overrideId;
  if (!templateId) {
    const sd = await findSharedDrive(drive);
    if (sd) {
      const nm = `CC_Template_${contractType === 'contractor' ? 'Contractor' : 'Vendor'}_Agreement`;
      const r = await drive.files.list({ q: `name='${nm}' and trashed=false and mimeType='application/vnd.google-apps.document'`, fields: 'files(id)', ...SD, corpora: 'drive', driveId: sd.id, pageSize: 1 });
      templateId = r.data.files?.[0]?.id;
    }
  }
  if (!templateId) return NextResponse.json({ error: `Template not found for "${contractType}". Go to Settings → Template Documents → Create Default Templates first.` }, { status: 404 });

  const safeName = (vendorName || 'Unknown').replace(/[^a-zA-Z0-9 &'()-]/g, '').trim();
  const dateStr = new Date().toISOString().slice(0, 10);
  const typeLabel = contractType === 'contractor' ? 'Contractor' : 'Vendor';
  const docName = `${projectCode || 'CONTRACT'}_${safeName}_${typeLabel}_Agreement_${dateStr}`;

  console.log(`[Contract] Copying template ${templateId} as "${docName}"...`);
  const copy = await drive.files.copy({ fileId: templateId, requestBody: { name: docName }, ...SD });
  const newDocId = copy.data.id;
  console.log(`[Contract] Created doc: ${newDocId}`);

  const requests = [];
  for (const [ph, val] of Object.entries(fields)) {
    if (ph.startsWith('_')) continue;
    if (val && val.trim()) requests.push({ replaceAllText: { containsText: { text: `{{${ph}}}`, matchCase: true }, replaceText: val } });
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
    const total = replies.reduce((s, r) => s + (r.replaceAllText?.occurrencesChanged || 0), 0);
    console.log(`[Contract] ${total} replacements made`);
    if (total === 0) console.warn('[Contract] WARNING: 0 replacements — check template has {{PLACEHOLDER}} markers');
  }

  let targetFolderId = null, folderPath = '';
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

  let contractPdfUrl = null, contractPdfName = null, combinedPdfUrl = null, combinedPdfName = null, hasInvoiceMerged = false;
  try {
    console.log('[Contract] Exporting as PDF...');
    const pdfRes = await drive.files.export({ fileId: newDocId, mimeType: 'application/pdf' }, { responseType: 'arraybuffer' });
    const contractPdfBytes = Buffer.from(pdfRes.data);
    contractPdfName = `${docName}.pdf`;
    const invoiceFileId = invoiceLink ? extractDriveFileId(invoiceLink) : null;
    if (contractType === 'vendor' && invoiceFileId) {
      try {
        const invRes = await drive.files.get({ fileId: invoiceFileId, alt: 'media', ...SD }, { responseType: 'arraybuffer' });
        const invoiceBytes = Buffer.from(invRes.data);
        const { PDFDocument } = await import('pdf-lib');
        const merged = await PDFDocument.create();
        const cDoc = await PDFDocument.load(contractPdfBytes);
        for (const p of await merged.copyPages(cDoc, cDoc.getPageIndices())) merged.addPage(p);
        const sep = merged.addPage(); const { width, height } = sep.getSize();
        sep.drawText('EXHIBIT B', { x: width / 2 - 55, y: height / 2 + 20, size: 26 });
        sep.drawText('Vendor Invoice / Proposal', { x: width / 2 - 95, y: height / 2 - 15, size: 14 });
        try { const iDoc = await PDFDocument.load(invoiceBytes); for (const p of await merged.copyPages(iDoc, iDoc.getPageIndices())) merged.addPage(p); }
        catch { try { let img; try { img = await merged.embedPng(invoiceBytes); } catch { img = await merged.embedJpg(invoiceBytes); } const ip = merged.addPage(); const s = Math.min(ip.getWidth() / img.width, ip.getHeight() / img.height) * 0.9; ip.drawImage(img, { x: (ip.getWidth() - img.width * s) / 2, y: (ip.getHeight() - img.height * s) / 2, width: img.width * s, height: img.height * s }); } catch { merged.addPage().drawText('Invoice could not be embedded.', { x: 50, y: 500, size: 14 }); } }
        combinedPdfName = `${docName}_COMBINED.pdf`;
        const cf = await drive.files.create({ requestBody: { name: combinedPdfName, mimeType: 'application/pdf', parents: [targetFolderId || driveId] }, media: { mimeType: 'application/pdf', body: Readable.from([Buffer.from(await merged.save())]) }, fields: 'id, name, webViewLink', supportsAllDrives: true });
        combinedPdfUrl = cf.data.webViewLink; hasInvoiceMerged = true;
      } catch (e) { console.error('[Contract] PDF merge failed:', e.message); }
    }
    if (!combinedPdfUrl) {
      const pf = await drive.files.create({ requestBody: { name: contractPdfName, mimeType: 'application/pdf', parents: [targetFolderId || driveId] }, media: { mimeType: 'application/pdf', body: Readable.from([contractPdfBytes]) }, fields: 'id, name, webViewLink', supportsAllDrives: true });
      contractPdfUrl = pf.data.webViewLink;
    }
  } catch (e) { console.error('[Contract] PDF export failed:', e.message); }

  const docFile = await drive.files.get({ fileId: newDocId, fields: 'id, name, webViewLink', ...SD });
  return NextResponse.json({ success: true, docId: newDocId, docName: docFile.data.name, docUrl: docFile.data.webViewLink || `https://docs.google.com/document/d/${newDocId}/edit`, pdfUrl: combinedPdfUrl || contractPdfUrl, pdfName: combinedPdfUrl ? combinedPdfName : contractPdfName, folderPath, hasCombinedPdf: !!(combinedPdfUrl || contractPdfUrl), hasInvoiceMerged });
}
