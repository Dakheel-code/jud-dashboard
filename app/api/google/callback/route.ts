/**
 * API: معالجة callback من Google OAuth (ربط التقويم)
 * GET /api/google/callback
 * 
 * يستقبل الـ code من Google ويحفظ refresh_token مشفراً
 * 
 * ملاحظة: هذا الفلو منفصل تماماً عن NextAuth (تسجيل الدخول)
 * - يستخدم state مخزن في Supabase (ليس cookies)
 * - لا يتداخل مع cookies حق NextAuth
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/meetings/encryption';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/google/callback`;

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
  const settingsUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://jud-dashboard.netlify.app'}/dashboard/my-calendar`;

  try {
    // التحقق من الأخطاء من Google
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(`${settingsUrl}?error=google_denied`);
    }

    // التحقق من وجود الـ code و state
    if (!code) {
      return NextResponse.redirect(`${settingsUrl}?error=no_code`);
    }

    if (!state) {
      return NextResponse.redirect(`${settingsUrl}?error=no_state`);
    }

    const supabase = getSupabaseClient();

    // التحقق من الـ state من Supabase (ليس cookies)
    const { data: savedState, error: stateError } = await supabase
      .from('google_oauth_states')
      .select('*')
      .eq('state', state)
      .single();

    if (stateError || !savedState) {
      console.error('State not found in DB:', stateError);
      return NextResponse.redirect(`${settingsUrl}?error=invalid_state`);
    }

    // التحقق من انتهاء صلاحية الـ state
    if (new Date(savedState.expires_at) < new Date()) {
      // حذف الـ state المنتهي
      await supabase.from('google_oauth_states').delete().eq('id', savedState.id);
      return NextResponse.redirect(`${settingsUrl}?error=state_expired`);
    }

    const userId = savedState.user_id;
    const codeVerifier = savedState.code_verifier;

    // حذف الـ state من DB (one-time use)
    await supabase.from('google_oauth_states').delete().eq('id', savedState.id);

    // التحقق من إعدادات Google
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return NextResponse.redirect(`${settingsUrl}?error=google_not_configured`);
    }

    // تبادل الـ code بـ tokens (مع PKCE code_verifier)
    const tokenParams: Record<string, string> = {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI,
    };

    // إضافة code_verifier إذا كان موجوداً (PKCE)
    if (codeVerifier) {
      tokenParams.code_verifier = codeVerifier;
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenParams),
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

    // تشفير refresh_token فقط
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    // حفظ في جدول user_integrations (منفصل عن NextAuth)
    const { error: dbError } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: userId,
        provider: 'google_calendar',
        refresh_token: encryptedRefreshToken,
        access_token: null, // لا نخزن access_token - سيتم جلبه عند الحاجة
        expires_at: null,
        scope: tokens.scope,
        email: userInfo.email,
        extra_data: {
          google_id: userInfo.id,
          calendar_id: 'primary',
          sync_enabled: true,
          last_sync_at: new Date().toISOString(),
        },
      }, {
        onConflict: 'user_id,provider',
      });
    
    // تحديث حالة الاتصال في employee_meeting_settings
    await supabase
      .from('employee_meeting_settings')
      .update({
        google_calendar_connected: true,
        google_email: userInfo.email,
      })
      .eq('employee_id', userId);

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
