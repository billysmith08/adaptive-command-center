import { NextResponse } from 'next/server';
import { ensureVendorFolder } from '@/lib/google-drive';

export async function POST(request) {
  try {
    const { vendorName } = await request.json();
    
    if (!vendorName) {
      return NextResponse.json({ error: 'Missing vendorName' }, { status: 400 });
    }
    
    const basePaths = [
      'ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 COIs & Workers Comp',
      'ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 W9s',
    ];
    
    const results = [];
    for (const basePath of basePaths) {
      try {
        const result = await ensureVendorFolder(basePath, vendorName);
        results.push({ basePath, ...result });
      } catch (err) {
        results.push({ basePath, error: err.message });
      }
    }
    
    return NextResponse.json({ success: true, folders: results });
  } catch (error) {
    console.error('Create folders error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
