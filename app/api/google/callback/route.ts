/**
 * API: معالجة callback من Google OAuth
 * GET /api/google/callback
 * 
 * يستقبل الـ code من Google ويحفظ refresh_token مشفراً
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/meetings/encryption';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`;

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleUserInfo {
  email: string;
  id: string;
  name?: string;
  picture?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // صفحة الإعدادات للتوجيه بعد الانتهاء
  const settingsUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/meetings/settings`;

  try {
    // التحقق من الأخطاء من Google
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(`${settingsUrl}?error=google_denied`);
    }

    // التحقق من وجود الـ code
    if (!code) {
      return NextResponse.redirect(`${settingsUrl}?error=no_code`);
    }

    // التحقق من الـ state (CSRF protection)
    const cookieStore = cookies();
    const stateCookie = cookieStore.get('google_oauth_state');
    
    if (!stateCookie?.value) {
      return NextResponse.redirect(`${settingsUrl}?error=invalid_state`);
    }

    let savedState: { state: string; userId: string; timestamp: number };
    try {
      savedState = JSON.parse(stateCookie.value);
    } catch {
      return NextResponse.redirect(`${settingsUrl}?error=invalid_state`);
    }

    // التحقق من تطابق الـ state
    if (savedState.state !== state) {
      return NextResponse.redirect(`${settingsUrl}?error=state_mismatch`);
    }

    // التحقق من انتهاء صلاحية الـ state (10 دقائق)
    if (Date.now() - savedState.timestamp > 600000) {
      return NextResponse.redirect(`${settingsUrl}?error=state_expired`);
    }

    const userId = savedState.userId;

    // حذف الـ cookie
    cookieStore.delete('google_oauth_state');

    // التحقق من إعدادات Google
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return NextResponse.redirect(`${settingsUrl}?error=google_not_configured`);
    }

    // تبادل الـ code بـ tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(`${settingsUrl}?error=token_exchange_failed`);
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // التحقق من وجود refresh_token
    if (!tokens.refresh_token) {
      console.error('No refresh_token received');
      return NextResponse.redirect(`${settingsUrl}?error=no_refresh_token`);
    }

    // جلب معلومات المستخدم من Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info');
      return NextResponse.redirect(`${settingsUrl}?error=user_info_failed`);
    }

    const userInfo: GoogleUserInfo = await userInfoResponse.json();

    // حفظ في قاعدة البيانات
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // تشفير refresh_token فقط - لا نخزن access_token
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    const { error: dbError } = await supabase
      .from('google_oauth_accounts')
      .upsert({
        employee_id: userId,
        google_email: userInfo.email,
        google_id: userInfo.id,
        refresh_token: encryptedRefreshToken,
        // لا نخزن access_token - سيتم جلبه عند الحاجة
        access_token: null,
        token_expires_at: null,
        calendar_id: 'primary',
        sync_enabled: true,
        last_sync_at: new Date().toISOString(),
        sync_error: null,
      }, {
        onConflict: 'employee_id',
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.redirect(`${settingsUrl}?error=database_error`);
    }

    // التوجيه إلى صفحة الإعدادات مع رسالة نجاح
    return NextResponse.redirect(`${settingsUrl}?success=google_connected`);

  } catch (error) {
    console.error('Error in /api/google/callback:', error);
    return NextResponse.redirect(`${settingsUrl}?error=internal_error`);
  }
}
