import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Simple password hashing
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// توليد token بسيط
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'اسم المستخدم وكلمة المرور مطلوبان' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const passwordHash = hashPassword(password);

    // البحث عن المستخدم في قاعدة البيانات
    const { data: user, error: userError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .eq('is_active', true)
      .single();

    // إذا لم يوجد في قاعدة البيانات، تحقق من البيانات الافتراضية
    if (!user) {
      // بيانات افتراضية للمسؤول
      if (username === 'admin' && password === 'admin123') {
        const token = generateToken();
        
        const response = NextResponse.json({
          success: true,
          token,
          user: {
            id: 'default-admin',
            username: 'admin',
            name: 'المسؤول الرئيسي',
            role: 'super_admin',
            permissions: ['manage_tasks', 'manage_stores', 'manage_users', 'manage_help', 'view_stats']
          },
          message: 'تم تسجيل الدخول بنجاح'
        });

        response.cookies.set('admin_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 60 * 60 * 24,
          path: '/',
        });

        return response;
      }

      return NextResponse.json(
        { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // التحقق من كلمة المرور
    if (user.password_hash !== passwordHash) {
      return NextResponse.json(
        { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ساعة

    // حفظ الجلسة في قاعدة البيانات
    await supabase.from('admin_sessions').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown'
    });

    // تحديث آخر تسجيل دخول
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: user.permissions
      },
      message: 'تم تسجيل الدخول بنجاح'
    });

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في تسجيل الدخول' },
      { status: 500 }
    );
  }
}
