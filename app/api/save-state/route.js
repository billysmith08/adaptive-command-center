import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { state, updated_at, updated_by } = await request.json();
    if (!state) return NextResponse.json({ error: 'No state provided' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { error } = await supabase
      .from('shared_state')
      .update({ state, updated_at: updated_at || new Date().toISOString(), updated_by: updated_by || null })
      .eq('id', 'shared');

    if (error) {
      console.error('Save-state error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Save-state failed:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
