import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserPermissions } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database configuration error');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// GET /api/auth/me - جلب معلومات المستخدم الحالي
export async function GET() {
  try {
    // التحقق من NextAuth session أولاً
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'غير مسجل الدخول' }, { status: 401 });
    }

    const sessionUser = session.user as any;
    if (!sessionUser?.id) {
      return NextResponse.json({ error: 'معرف المستخدم غير موجود' }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    // جلب بيانات المستخدم من DB
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('id, username, name, email, avatar, is_active')
      .eq('id', sessionUser.id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'الحساب معطل' }, { status: 403 });
    }

    // جلب صلاحيات RBAC الحقيقية
    let rbacRoles: string[] = [];
    let rbacPermissions: string[] = [];
    try {
      const rbac = await getUserPermissions(user.id);
      rbacRoles = rbac.roles;
      rbacPermissions = rbac.permissions;
    } catch {
      // fallback
    }

    return NextResponse.json({
      user: {
        ...user,
        role: rbacRoles[0] || 'viewer',
        roles: rbacRoles,
        permissions: rbacPermissions,
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
