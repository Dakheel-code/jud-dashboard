/**
 * API: بدء عملية ربط Google Calendar
 * GET /api/google/connect
 * 
 * يُنشئ رابط OAuth ويوجه الموظف إلى Google للموافقة
 * 
 * ملاحظة: هذا الفلو منفصل تماماً عن NextAuth (تسجيل الدخول)
 * - يستخدم state مخزن في Supabase (ليس cookies)
 * - لا يتداخل مع cookies حق NextAuth
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseKey);
}

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`;

// Scopes المطلوبة للتقويم فقط (منفصلة عن Login)
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

// جلب معرف المستخدم الحالي من NextAuth session أو admin_user cookie
async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  try {
    // أولاً: جرب جلب من NextAuth JWT token
    const { getToken } = await import('next-auth/jwt');
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (token?.uid) {
      return token.uid as string;
    }
    
    // ثانياً: جرب من admin_user cookie (للتوافق مع النظام القديم)
    const cookieStore = cookies();
    const userCookie = cookieStore.get('admin_user');
    if (userCookie?.value) {
      const user = JSON.parse(decodeURIComponent(userCookie.value));
      return user.id || null;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// إنشاء code_verifier لـ PKCE
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// إنشاء code_challenge من code_verifier
function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export async function GET(request: NextRequest) {
  try {
    // التحقق من المصادقة
    const userId = await getCurrentUserId(request);
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

    const supabase = getSupabaseClient();

    // حذف أي states قديمة لهذا المستخدم (تنظيف)
    await supabase
      .from('google_oauth_states')
      .delete()
      .eq('user_id', userId);

    // إنشاء state عشوائي قوي
    const state = crypto.randomBytes(32).toString('hex');
    
    // إنشاء PKCE code_verifier
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // حفظ الـ state في Supabase (ليس cookies) - ينتهي بعد 10 دقائق
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    const { error: insertError } = await supabase
      .from('google_oauth_states')
      .insert({
        user_id: userId,
        state: state,
        code_verifier: codeVerifier,
        expires_at: expiresAt,
      });

    if (insertError) {
      return NextResponse.json(
        { error: 'فشل في حفظ حالة المصادقة', code: 'STATE_SAVE_ERROR' },
        { status: 500 }
      );
    }

    // بناء رابط OAuth (بدون PKCE - Google مع client_secret لا يحتاج PKCE)
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
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
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
