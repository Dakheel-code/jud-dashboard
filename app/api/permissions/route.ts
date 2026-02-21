import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/permissions?type=roles|permissions|all
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || 'all';
  const supabase = getSupabase();

  try {
    if (type === 'permissions') {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category');
      if (error) throw error;
      return NextResponse.json({ permissions: data });
    }

    if (type === 'roles') {
      const { data: roles, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('created_at');
      if (rolesError) throw rolesError;

      const { data: rolePerms, error: rpError } = await supabase
        .from('role_permissions')
        .select('*');
      if (rpError) throw rpError;

      const rolesWithPerms = roles.map((r: any) => ({
        ...r,
        permissions: rolePerms.filter((rp: any) => rp.role_id === r.id),
      }));
      return NextResponse.json({ roles: rolesWithPerms });
    }

    // all
    const [rolesRes, permsRes, rolePermsRes] = await Promise.all([
      supabase.from('roles').select('*').order('created_at'),
      supabase.from('permissions').select('*').order('category'),
      supabase.from('role_permissions').select('*'),
    ]);

    if (rolesRes.error) throw rolesRes.error;
    if (permsRes.error) throw permsRes.error;
    if (rolePermsRes.error) throw rolePermsRes.error;

    const rolesWithPerms = rolesRes.data.map((r: any) => ({
      ...r,
      permissions: rolePermsRes.data.filter((rp: any) => rp.role_id === r.id),
    }));

    return NextResponse.json({
      roles: rolesWithPerms,
      permissions: permsRes.data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/permissions - إنشاء دور جديد أو تحديث صلاحيات
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;
  const supabase = getSupabase();

  try {
    if (action === 'create_role') {
      const { name, name_ar, description, color, icon } = body;
      const { data, error } = await supabase
        .from('roles')
        .insert({ name, name_ar, description, color, icon, is_system: false })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ role: data });
    }

    if (action === 'update_role') {
      const { id, name, name_ar, description, color, icon } = body;
      const { data, error } = await supabase
        .from('roles')
        .update({ name, name_ar, description, color, icon, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ role: data });
    }

    if (action === 'save_permissions') {
      const { role_id, permissions } = body;
      // upsert جميع الصلاحيات للدور
      const upsertData = permissions.map((p: any) => ({
        role_id,
        permission_id: p.permission_id,
        granted: p.granted,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('role_permissions')
        .upsert(upsertData, { onConflict: 'role_id,permission_id' });
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'action غير معروف' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/permissions?role_id=xxx
export async function DELETE(req: NextRequest) {
  const role_id = req.nextUrl.searchParams.get('role_id');
  if (!role_id) return NextResponse.json({ error: 'role_id مطلوب' }, { status: 400 });

  const supabase = getSupabase();
  try {
    // تحقق أن الدور ليس نظامياً
    const { data: role } = await supabase
      .from('roles')
      .select('is_system')
      .eq('id', role_id)
      .single();

    if (role?.is_system) {
      return NextResponse.json({ error: 'لا يمكن حذف أدوار النظام' }, { status: 403 });
    }

    const { error } = await supabase.from('roles').delete().eq('id', role_id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
