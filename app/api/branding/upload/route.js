import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type'); // 'loginBg' or 'dashboardBg'
    const userEmail = formData.get('userEmail');

    // Admin check
    const ADMIN_EMAILS = ['billy@weareadptv.com', 'clancy@weareadptv.com', 'billysmith08@gmail.com'];
    if (!ADMIN_EMAILS.includes(userEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!file || !type) {
      return NextResponse.json({ error: 'Missing file or type' }, { status: 400 });
    }

    const ext = file.name.split('.').pop();
    const fileName = `${type}_${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('branding')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('branding').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // Save URL in app_settings branding
    const { data: settings } = await supabase.from('app_settings').select('id, settings').limit(1).single();
    if (settings) {
      const branding = settings.settings?.branding || {};
      branding[type] = publicUrl;
      const updatedSettings = { ...settings.settings, branding };
      await supabase.from('app_settings').update({ 
        settings: updatedSettings, 
        updated_at: new Date().toISOString() 
      }).eq('id', settings.id);
    }

    return NextResponse.json({ url: publicUrl });
  } catch (e) {
    console.error('Branding upload error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
