/**
 * API: بدء عملية ربط Google Calendar
 * GET /api/google/connect
 * 
 * يُنشئ رابط OAuth ويوجه الموظف إلى Google للموافقة
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`;

// Scopes المطلوبة
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

// جلب معرف المستخدم الحالي
async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('admin_user');
    if (userCookie?.value) {
      const user = JSON.parse(userCookie.value);
      return user.id || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // التحقق من المصادقة
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'غير مصرح', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // التحقق من وجود إعدادات Google
    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { error: 'Google OAuth غير مُعد', code: 'GOOGLE_NOT_CONFIGURED' },
        { status: 500 }
      );
    }

    // إنشاء state token للحماية من CSRF
    const state = crypto.randomBytes(32).toString('hex');
    
    // حفظ الـ state في cookie مؤقت (10 دقائق)
    const cookieStore = cookies();
    cookieStore.set('google_oauth_state', JSON.stringify({
      state,
      userId,
      timestamp: Date.now(),
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 دقائق
      path: '/',
    });

    // بناء رابط OAuth
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('access_type', 'offline'); // للحصول على refresh_token
    authUrl.searchParams.set('prompt', 'consent'); // لضمان الحصول على refresh_token
    authUrl.searchParams.set('state', state);

    // إرجاع الرابط أو التوجيه مباشرة
    const returnUrl = request.nextUrl.searchParams.get('return_url');
    
    if (returnUrl === 'json') {
      return NextResponse.json({
        success: true,
        auth_url: authUrl.toString(),
      });
    }

    // التوجيه مباشرة إلى Google
    return NextResponse.redirect(authUrl.toString());

  } catch (error) {
    console.error('Error in /api/google/connect:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
