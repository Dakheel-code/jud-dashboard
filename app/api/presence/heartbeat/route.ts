import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing Supabase envs");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST() {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.error!;

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("admin_users")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", auth.user!.id);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
