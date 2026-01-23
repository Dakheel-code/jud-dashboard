import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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
    const cookieStore = cookies();
    const adminUserCookie = cookieStore.get('admin_user');
    
    if (!adminUserCookie?.value) {
      return NextResponse.json({ error: 'غير مسجل الدخول' }, { status: 401 });
    }

    let adminUser;
    try {
      adminUser = JSON.parse(adminUserCookie.value);
    } catch {
      return NextResponse.json({ error: 'بيانات جلسة غير صالحة' }, { status: 401 });
    }

    if (!adminUser?.id) {
      return NextResponse.json({ error: 'معرف المستخدم غير موجود' }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    // جلب بيانات المستخدم الكاملة من قاعدة البيانات
    const { data: user, error } = await supabase
      .from('admin_users')
      .select('id, username, name, email, role, roles, permissions, avatar, is_active')
      .eq('id', adminUser.id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'الحساب معطل' }, { status: 403 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('GET /api/auth/me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
