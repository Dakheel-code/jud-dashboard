import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase envs");
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET — جلب جميع الفرق مع أعضائها
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authenticated) return auth.error!;

  const supabase = supabaseAdmin();

  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, description, leader_id, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "فشل في جلب الفرق" }, { status: 500 });
  }

  // جلب أعضاء كل فريق
  const teamsWithMembers = await Promise.all(
    (teams || []).map(async (team) => {
      const { data: members } = await supabase
        .from("admin_users")
        .select("id, name, username, avatar, role, is_active")
        .eq("team_id", team.id)
        .eq("is_active", true);
      return { ...team, members: members || [] };
    })
  );

  return NextResponse.json({ teams: teamsWithMembers });
}

// POST — إنشاء فريق جديد
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authenticated) return auth.error!;

  try {
    const { name, description, memberIds } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "اسم الفريق مطلوب" }, { status: 400 });
    }

    const supabase = supabaseAdmin();

    // إنشاء الفريق مع المستخدم الحالي كمدير
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        leader_id: auth.user!.id,
      })
      .select()
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "فشل في إنشاء الفريق", detail: teamError?.message }, { status: 500 });
    }

    // ربط الأعضاء بالفريق
    if (memberIds && memberIds.length > 0) {
      await supabase
        .from("admin_users")
        .update({ team_id: team.id })
        .in("id", memberIds);
    }

    return NextResponse.json({ team, message: "تم إنشاء الفريق بنجاح" });
  } catch (e: any) {
    return NextResponse.json({ error: "حدث خطأ", detail: e?.message }, { status: 500 });
  }
}

// DELETE — حذف فريق
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authenticated) return auth.error!;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "معرف الفريق مطلوب" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  // إزالة team_id من الأعضاء أولاً
  await supabase
    .from("admin_users")
    .update({ team_id: null })
    .eq("team_id", id);

  // حذف الفريق
  const { error } = await supabase.from("teams").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "فشل في حذف الفريق" }, { status: 500 });
  }

  return NextResponse.json({ message: "تم حذف الفريق بنجاح" });
}
