import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase envs");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.error!;

  const supabase = supabaseAdmin();
  const userId = auth.user!.id;

  // هل المستخدم مدير فريق؟
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name, description, leader_id")
    .eq("leader_id", userId)
    .single();

  if (teamError || !team) {
    return NextResponse.json({ team: null, members: [] });
  }

  // جلب أعضاء الفريق من admin_users
  const { data: members, error: membersError } = await supabase
    .from("admin_users")
    .select("id, name, username, email, avatar, role, is_active, last_seen_at, team_id")
    .eq("team_id", team.id)
    .eq("is_active", true);

  if (membersError) {
    return NextResponse.json({ team, members: [] });
  }

  return NextResponse.json({ team, members: members || [] });
}
