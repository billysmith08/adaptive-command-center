import { NextResponse } from 'next/server';
import { ensureVendorFolder, uploadFile } from '@/lib/google-drive';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const vendorName = formData.get('vendorName');
    const docType = formData.get('docType'); // 'coi', 'w9', 'invoice', 'banking', 'contract'
    const basePath = formData.get('basePath'); // full path like "ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 COIs & Workers Comp"
    
    if (!file || !vendorName || !basePath) {
      return NextResponse.json({ error: 'Missing required fields: file, vendorName, basePath' }, { status: 400 });
    }
    
    // Ensure vendor folder exists (create if not)
    const { folderId, created } = await ensureVendorFolder(basePath, vendorName);
    
    // Upload the file
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFile(folderId, file.name, buffer, file.type);
    
    return NextResponse.json({
      success: true,
      file: { name: uploaded.name, id: uploaded.id, link: uploaded.webViewLink },
      folder: { id: folderId, created, path: `${basePath}/${vendorName}` },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
