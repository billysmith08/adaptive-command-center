import { NextResponse } from 'next/server';
import { scanDocTypeFolder, searchVendorDocs } from '@/lib/google-drive';

const DOC_PATHS = {
  coi: 'ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 COIs & Workers Comp',
  w9: 'ADMIN/External Vendors (W9 & Work Comp)/Dec 2025 - Dec 2026/2026 W9s',
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'coi', 'w9', or 'all'
    const search = searchParams.get('search'); // optional vendor name search
    
    if (search) {
      const results = await searchVendorDocs(search);
      return NextResponse.json({ results });
    }
    
    if (type && DOC_PATHS[type]) {
      const vendors = await scanDocTypeFolder(DOC_PATHS[type]);
      return NextResponse.json({ type, vendors });
    }
    
    // Scan both COI and W9
    const [coiVendors, w9Vendors] = await Promise.all([
      scanDocTypeFolder(DOC_PATHS.coi),
      scanDocTypeFolder(DOC_PATHS.w9),
    ]);
    
    return NextResponse.json({ coi: coiVendors, w9: w9Vendors });
  } catch (error) {
    console.error('Drive scan error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
