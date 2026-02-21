import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// الأدوار الرسمية الثمانية
const OFFICIAL_ROLES = [
  { key: 'owner',           name: 'المالك',       description: 'صلاحيات كاملة غير محدودة على كل النظام', color: '#dc2626', icon: '👑',  is_system: true },
  { key: 'general_manager', name: 'المدير العام', description: 'إدارة كاملة مع صلاحيات واسعة جداً',     color: '#9333ea', icon: '🏆', is_system: true },
  { key: 'manager',         name: 'مدير',         description: 'إدارة الفريق والعمليات اليومية',          color: '#2563eb', icon: '📋', is_system: true },
  { key: 'team_leader',     name: 'قائد فريق',    description: 'قيادة الفريق ومتابعة المهام والحضور',     color: '#d97706', icon: '🎯', is_system: true },
  { key: 'account_manager', name: 'مدير حساب',    description: 'إدارة حسابات العملاء والمتاجر',           color: '#ec4899', icon: '💼', is_system: true },
  { key: 'media_buyer',     name: 'ميديا باير',   description: 'إدارة الحملات الإعلانية والتقارير',       color: '#6366f1', icon: '📊', is_system: true },
  { key: 'designer',        name: 'مصمم',         description: 'إنشاء وتعديل التصاميم والمحتوى المرئي',  color: '#0891b2', icon: '🎨', is_system: true },
  { key: 'content_writer',  name: 'كاتب محتوى',  description: 'كتابة وتحرير المحتوى النصي',              color: '#059669', icon: '✍️', is_system: true },
];

// مفاتيح الأدوار القديمة التي يجب حذفها
const LEGACY_ROLE_KEYS = ['super_admin', 'admin', 'editor', 'employee', 'viewer'];

async function syncRoles(supabase: any) {
  try {
    // 1) أضف/حدّث الأدوار الجديدة — name و name_ar كلاهما الاسم العربي
    for (const role of OFFICIAL_ROLES) {
      await supabase.from('admin_roles').upsert(
        {
          key: role.key,
          name: role.name,
          name_ar: role.name,
          description: role.description,
          color: role.color,
          icon: role.icon,
          is_system: role.is_system,
        },
        { onConflict: 'key' }
      );
    }
    // 2) احذف الأدوار القديمة
    const { data: legacyRoles } = await supabase
      .from('admin_roles')
      .select('id')
      .in('key', LEGACY_ROLE_KEYS);
    if (legacyRoles && legacyRoles.length > 0) {
      const ids = legacyRoles.map((r: any) => r.id);
      await supabase.from('admin_role_permissions').delete().in('role_id', ids);
      await supabase.from('admin_roles').delete().in('id', ids);
    }
  } catch {}
}

// GET /api/permissions?type=roles|permissions|all
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || 'all';
  const supabase = getSupabase();

  // مزامنة الأدوار الرسمية تلقائياً
  await syncRoles(supabase);

  try {
    if (type === 'permissions') {
      const { data, error } = await supabase
        .from('admin_permissions')
        .select('*')
        .order('category');
      if (error) throw error;
      return NextResponse.json({ permissions: data });
    }

    if (type === 'roles') {
      const { data: roles, error: rolesError } = await supabase
        .from('admin_roles')
        .select('*')
        .order('created_at');
      if (rolesError) throw rolesError;

      const { data: rolePerms, error: rpError } = await supabase
        .from('admin_role_permissions')
        .select('*');
      if (rpError) throw rpError;

      const rolesWithPerms = roles.map((r: any) => ({
        ...r,
        name_ar: r.name_ar || r.name,
        permissions: rolePerms.filter((rp: any) => rp.role_id === r.id),
      }));
      return NextResponse.json({ roles: rolesWithPerms });
    }

    // all
    const [rolesRes, permsRes, rolePermsRes] = await Promise.all([
      supabase.from('admin_roles').select('*').order('created_at'),
      supabase.from('admin_permissions').select('*').order('category'),
      supabase.from('admin_role_permissions').select('*'),
    ]);

    if (rolesRes.error) throw rolesRes.error;
    if (permsRes.error) throw permsRes.error;
    if (rolePermsRes.error) throw rolePermsRes.error;

    const rolesWithPerms = rolesRes.data.map((r: any) => ({
      ...r,
      name_ar: r.name_ar || r.name,
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
        .from('admin_roles')
        .insert({ key: name, name: name_ar, description, color, icon, is_system: false })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ role: data });
    }

    if (action === 'update_role') {
      const { id, name, name_ar, description, color, icon } = body;
      const { data, error } = await supabase
        .from('admin_roles')
        .update({ key: name, name: name_ar, description, color, icon, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ role: data });
    }

    if (action === 'save_permissions') {
      const { role_id, permissions } = body;
      const upsertData = permissions.map((p: any) => ({
        role_id,
        permission_id: p.permission_id,
        granted: p.granted,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('admin_role_permissions')
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
      .from('admin_roles')
      .select('is_system')
      .eq('id', role_id)
      .single();

    if (role?.is_system) {
      return NextResponse.json({ error: 'لا يمكن حذف أدوار النظام' }, { status: 403 });
    }

    const { error } = await supabase.from('admin_roles').delete().eq('id', role_id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
