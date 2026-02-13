import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const PRESENCE_KEY = "presence";
const STALE_THRESHOLD = 90000; // 90 seconds — if no heartbeat, considered offline

export async function POST(req) {
  try {
    const { email, profile } = await req.json();
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    // Read current presence
    const { data: row } = await supabase
      .from("shared_state")
      .select("state")
      .eq("id", PRESENCE_KEY)
      .single();

    const current = row?.state || {};
    const now = Date.now();

    // Update this user's entry
    current[email] = {
      lastSeen: now,
      profile: profile || current[email]?.profile || {},
    };

    // Prune stale users (offline > 90s)
    Object.keys(current).forEach(e => {
      if (now - (current[e]?.lastSeen || 0) > STALE_THRESHOLD) delete current[e];
    });

    // Upsert
    await supabase
      .from("shared_state")
      .upsert({ id: PRESENCE_KEY, state: current, updated_at: new Date().toISOString() }, { onConflict: "id" });

    return NextResponse.json({ ok: true, active: Object.keys(current).length });
  } catch (e) {
    console.error("Presence heartbeat error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data: row } = await supabase
      .from("shared_state")
      .select("state")
      .eq("id", PRESENCE_KEY)
      .single();

    const current = row?.state || {};
    const now = Date.now();

    // Filter to only active users
    const active = {};
    Object.entries(current).forEach(([email, info]) => {
      if (now - (info?.lastSeen || 0) <= STALE_THRESHOLD) {
        active[email] = info;
      }
    });

    return NextResponse.json({ users: active });
  } catch (e) {
    return NextResponse.json({ users: {} });
  }
}
