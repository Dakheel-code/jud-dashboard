import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { logAuditFromRequest } from '@/lib/audit';
import { getUserPermissions } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

function verifyPassword(password: string, hash: string): boolean {
  if (hash.length === 64 && /^[a-f0-9]{64}$/.test(hash)) {
    const sha256 = crypto.createHash('sha256').update(password).digest('hex');
    return sha256 === hash;
  }
  return bcrypt.compareSync(password, hash);
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

    // تحويل اسم المستخدم لحروف صغيرة لتجاهل حالة الحروف
    const normalizedUsername = username.toLowerCase().trim();

    const supabase = getSupabaseClient();

    // البحث عن المستخدم في قاعدة البيانات (بحث غير حساس لحالة الحروف)
    const { data: user, error: userError } = await supabase
      .from('admin_users')
      .select('*')
      .ilike('username', normalizedUsername)
      .eq('is_active', true)
      .single();

    // إذا لم يوجد في قاعدة البيانات، تحقق من البيانات الافتراضية
    if (!user) {
      // بيانات افتراضية للمسؤول
      if (normalizedUsername === 'admin' && password === 'admin123') {
        const token = generateToken();

        await logAuditFromRequest(request, 'default-admin', 'auth.login', { meta: { method: 'credentials', username: 'admin' } });

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

      await logAuditFromRequest(request, null, 'auth.login_failed', { meta: { username: normalizedUsername, reason: 'user_not_found' } });
      return NextResponse.json(
        { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // التحقق من كلمة المرور
    if (!verifyPassword(password, user.password_hash)) {
      await logAuditFromRequest(request, user.id, 'auth.login_failed', { meta: { username: normalizedUsername, reason: 'wrong_password' } });
      return NextResponse.json(
        { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // ترقية تلقائية: إذا كان الهاش قديم (SHA256) → أعد التشفير بـ bcrypt
    if (user.password_hash.length === 64 && /^[a-f0-9]{64}$/.test(user.password_hash)) {
      const newHash = hashPassword(password);
      await supabase
        .from('admin_users')
        .update({ password_hash: newHash })
        .eq('id', user.id);
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

    await logAuditFromRequest(request, user.id, 'auth.login', { meta: { method: 'credentials', username: user.username } });

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

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: rbacRoles[0] || user.role,
        roles: rbacRoles,
        permissions: rbacPermissions
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
    return NextResponse.json(
      { error: 'حدث خطأ في تسجيل الدخول' },
      { status: 500 }
    );
  }
}
