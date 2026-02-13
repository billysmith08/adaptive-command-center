import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const body = await request.json();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // New per-slice format: { key, state, updated_at, updated_by }
    if (body.key) {
      const { key, state, updated_at, updated_by } = body;
      const { error } = await supabase
        .from('shared_state')
        .upsert({ id: key, state, updated_at: updated_at || new Date().toISOString(), updated_by: updated_by || null }, { onConflict: 'id' });
      if (error) {
        console.error('Save-state error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, key });
    }
    
    // Legacy blob format: { state, updated_at, updated_by }
    if (body.state) {
      const { state, updated_at, updated_by } = body;
      const { error } = await supabase
        .from('shared_state')
        .update({ state, updated_at: updated_at || new Date().toISOString(), updated_by: updated_by || null })
        .eq('id', 'shared');
      if (error) {
        console.error('Save-state error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch (e) {
    console.error('Save-state failed:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
