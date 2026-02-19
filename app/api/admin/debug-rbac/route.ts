import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, key);

  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  // جلب كل صفوف admin_user_roles للمستخدم
  const { data: userRoles, error: e1 } = await supabase
    .from('admin_user_roles')
    .select('*')
    .eq('user_id', userId);

  // جلب كل الأدوار المتاحة
  const { data: allRoles, error: e2 } = await supabase
    .from('admin_roles')
    .select('id, key, name');

  // جلب بيانات admin_users مباشرة
  const { data: adminUser, error: e3 } = await supabase
    .from('admin_users')
    .select('id, name, role, roles')
    .eq('id', userId)
    .single();

  return NextResponse.json({
    session_uid: userId,
    admin_users_row: adminUser,
    admin_user_roles: userRoles,
    all_roles: allRoles,
    errors: { e1, e2, e3 },
  });
}
