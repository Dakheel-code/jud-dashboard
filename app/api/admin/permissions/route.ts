import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/admin/permissions - جلب جميع الأدوار والصلاحيات
export async function GET() {
  try {
    const supabase = getSupabase()

    const [rolesRes, permsRes, rolePermsRes] = await Promise.all([
      supabase.from("roles").select("*").order("created_at"),
      supabase.from("permissions").select("*").order("category"),
      supabase.from("role_permissions").select("*"),
    ])

    if (rolesRes.error) throw rolesRes.error
    if (permsRes.error) throw permsRes.error
    if (rolePermsRes.error) throw rolePermsRes.error

    const roles = rolesRes.data.map((r: any) => ({
      ...r,
      permissions: rolePermsRes.data.filter((rp: any) => rp.role_id === r.id),
    }))

    return NextResponse.json({ success: true, roles, permissions: permsRes.data })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/admin/permissions - إنشاء دور جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, name_ar, description, color, icon } = body

    if (!name || !name_ar) {
      return NextResponse.json({ success: false, error: "name and name_ar are required" }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data: role, error } = await supabase
      .from("roles")
      .insert({ name, name_ar, description, color, icon, is_system: false })
      .select()
      .single()

    if (error) throw error

    // إنشاء صلاحيات فارغة للدور الجديد
    const { data: allPerms } = await supabase.from("permissions").select("id")
    if (allPerms && allPerms.length > 0) {
      const rolePerms = allPerms.map((p: any) => ({
        role_id: role.id,
        permission_id: p.id,
        granted: false,
      }))
      await supabase.from("role_permissions").insert(rolePerms)
    }

    return NextResponse.json({ success: true, role })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PUT /api/admin/permissions - تحديث صلاحيات دور
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { role_id, permissions, role_data } = body

    if (!role_id) {
      return NextResponse.json({ success: false, error: "role_id is required" }, { status: 400 })
    }

    const supabase = getSupabase()

    // تحديث بيانات الدور إذا أُرسلت
    if (role_data) {
      const { error } = await supabase
        .from("roles")
        .update({ ...role_data, updated_at: new Date().toISOString() })
        .eq("id", role_id)
      if (error) throw error
    }

    // تحديث الصلاحيات إذا أُرسلت
    if (permissions && permissions.length > 0) {
      const upsertData = permissions.map((p: any) => ({
        role_id,
        permission_id: p.permission_id,
        granted: p.granted,
        updated_at: new Date().toISOString(),
      }))
      const { error } = await supabase
        .from("role_permissions")
        .upsert(upsertData, { onConflict: "role_id,permission_id" })
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/permissions?role_id=xxx - حذف دور
export async function DELETE(request: NextRequest) {
  try {
    const roleId = request.nextUrl.searchParams.get("role_id")

    if (!roleId) {
      return NextResponse.json({ success: false, error: "role_id is required" }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data: role } = await supabase
      .from("roles")
      .select("is_system")
      .eq("id", roleId)
      .single()

    if (role?.is_system) {
      return NextResponse.json({ success: false, error: "لا يمكن حذف أدوار النظام" }, { status: 403 })
    }

    const { error } = await supabase.from("roles").delete().eq("id", roleId)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
