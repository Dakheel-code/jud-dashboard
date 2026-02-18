import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { requireAdmin } from '@/lib/auth-guard';
import { logAuditFromRequest } from '@/lib/audit';
import { getUserPermissions } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// GET - جلب جميع المستخدمين
export async function GET(request: NextRequest) {
  try {
    // التحقق من الجلسة
    const auth = await requireAdmin();
    if (!auth.authenticated) return auth.error!;

    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    // فلاتر اختيارية
    const activeOnly = searchParams.get('active') === 'true';
    const role = searchParams.get('role');

    let query = supabase
      .from('admin_users')
      .select('id, username, name, email, is_active, avatar, created_at, updated_at, last_login')
      .order('name', { ascending: true });

    // فلترة المستخدمين النشطين فقط
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: users, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'فشل في جلب المستخدمين' }, { status: 500 });
    }

    // جلب أدوار وصلاحيات RBAC لكل مستخدم
    const usersWithRbac = await Promise.all(
      (users || []).map(async (user) => {
        let rbacRoles: string[] = [];
        let rbacPermissions: string[] = [];
        try {
          const rbac = await getUserPermissions(user.id);
          rbacRoles = rbac.roles;
          rbacPermissions = rbac.permissions;
        } catch {
          // fallback
        }
        return {
          ...user,
          role: rbacRoles[0] || 'employee',
          roles: rbacRoles,
          permissions: rbacPermissions,
        };
      })
    );

    // فلترة حسب الدور (بعد جلب RBAC)
    let filteredUsers = usersWithRbac;
    if (role) {
      filteredUsers = usersWithRbac.filter(u => u.roles.includes(role));
    }

    return NextResponse.json({ users: filteredUsers });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// POST - إضافة مستخدم جديد
export async function POST(request: NextRequest) {
  try {
    // التحقق من الجلسة
    const auth = await requireAdmin();
    if (!auth.authenticated) return auth.error!;

    const { username, password, name, email, role, roles, permissions } = await request.json();

    const userRoles = roles || (role ? [role] : ['account_manager']);

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: 'جميع الحقول المطلوبة يجب ملؤها' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // التحقق من عدم وجود المستخدم
    const { data: existingUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'اسم المستخدم موجود مسبقاً' },
        { status: 400 }
      );
    }

    // إضافة المستخدم
    const { data: newUser, error } = await supabase
      .from('admin_users')
      .insert({
        username,
        password_hash: hashPassword(password),
        name,
        email: email || null,
        role: userRoles[0],
        roles: userRoles,
        permissions: permissions || [],
        is_active: true
      })
      .select('id, username, name, email, role, roles, permissions, is_active, created_at, last_login')
      .single();

    if (error) {
      return NextResponse.json({ error: 'فشل في إنشاء المستخدم' }, { status: 500 });
    }

    await logAuditFromRequest(request, auth.user!.id, 'users.create', { entity: 'admin_users', entity_id: newUser.id, meta: { username, name, roles: userRoles } });

    return NextResponse.json({ user: newUser, message: 'تم إنشاء المستخدم بنجاح' });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// PUT - تحديث مستخدم
export async function PUT(request: NextRequest) {
  try {
    // التحقق من الجلسة
    const auth = await requireAdmin();
    if (!auth.authenticated) return auth.error!;

    const { id, username, password, name, email, role, roles, permissions, is_active } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (username) updateData.username = username;
    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (roles) {
      updateData.roles = roles;
      updateData.role = roles[0];
    } else if (role) {
      updateData.role = role;
    }
    if (permissions) updateData.permissions = permissions;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (password) updateData.password_hash = hashPassword(password);

    const { data: updatedUser, error } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, name, email, role, roles, permissions, is_active, created_at, last_login')
      .single();

    if (error) {
      return NextResponse.json({ error: 'فشل في تحديث المستخدم' }, { status: 500 });
    }

    await logAuditFromRequest(request, auth.user!.id, 'users.update', { entity: 'admin_users', entity_id: id, meta: { changes: updateData } });

    return NextResponse.json({ user: updatedUser, message: 'تم تحديث المستخدم بنجاح' });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// DELETE - حذف مستخدم
export async function DELETE(request: NextRequest) {
  try {
    // التحقق من الجلسة
    const auth = await requireAdmin();
    if (!auth.authenticated) return auth.error!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // حذف جلسات المستخدم أولاً
    await supabase.from('admin_sessions').delete().eq('user_id', id);

    // حذف المستخدم
    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'فشل في حذف المستخدم' }, { status: 500 });
    }

    await logAuditFromRequest(request, auth.user!.id, 'users.delete', { entity: 'admin_users', entity_id: id });

    return NextResponse.json({ message: 'تم حذف المستخدم بنجاح' });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
