/**
 * GET /api/admin/profile/me
 * يجلب بيانات المستخدم الحالي من DB مباشرة (محدّثة دائماً)
 * يُستخدم بعد تسجيل الدخول لضمان الحصول على أحدث البيانات
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserPermissions } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

export async function GET() {
  try {
    const supabase = getAdminClient();
    let userId: string | null = null;

    // 1. حاول من NextAuth session
    try {
      const session = await getServerSession(authOptions);
      const sessionUser = session?.user as any;
      if (sessionUser?.id) {
        userId = sessionUser.id;
      }
    } catch {}

    // 2. حاول من admin_user cookie
    if (!userId) {
      try {
        const cookieStore = cookies();
        const adminUserCookie = cookieStore.get('admin_user');
        if (adminUserCookie) {
          const parsed = JSON.parse(decodeURIComponent(adminUserCookie.value));
          userId = parsed?.id;
        }
      } catch {}
    }

    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // جلب البيانات الأساسية من DB
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('id, username, name, email, phone, avatar, is_active')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // جلب role/roles/permissions من RBAC (مصدر الحقيقة)
    const rbac = await getUserPermissions(userId);

    return NextResponse.json({
      user: {
        ...user,
        role:        rbac.roles[0] || 'employee',
        roles:       rbac.roles,
        permissions: rbac.permissions,
      },
    });
  } catch {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}
