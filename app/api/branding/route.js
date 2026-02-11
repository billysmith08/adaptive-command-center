import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data } = await supabase.from('app_settings').select('settings').limit(1).single();
    const branding = data?.settings?.branding || {};
    return NextResponse.json({ loginBg: branding.loginBg || "", dashboardBg: branding.dashboardBg || "" });
  } catch (e) {
    return NextResponse.json({ loginBg: "", dashboardBg: "" });
  }
}

// POST to clear a background
export async function POST(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { type, userEmail } = await request.json();
    const ADMIN_EMAILS = ['billy@weareadptv.com', 'clancy@weareadptv.com', 'billysmith08@gmail.com'];
    if (!ADMIN_EMAILS.includes(userEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const { data: settings } = await supabase.from('app_settings').select('id, settings').limit(1).single();
    if (settings) {
      const branding = settings.settings?.branding || {};
      branding[type] = "";
      const updatedSettings = { ...settings.settings, branding };
      await supabase.from('app_settings').update({ settings: updatedSettings, updated_at: new Date().toISOString() }).eq('id', settings.id);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
