/**
 * Snapchat OAuth Callback - استقبال الكود وتبديله بالتوكنات
 * GET /api/integrations/snapchat/callback?code=...&state=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exchangeCodeForToken } from '@/lib/integrations/snapchat';
import { saveTokens } from '@/lib/integrations/token-manager';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // التحقق من الأخطاء من Snapchat
    if (error) {
      console.error('Snapchat OAuth error:', error, errorDescription);
      const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
      return NextResponse.redirect(`${baseUrl}/admin/stores?error=snapchat_oauth_denied`);
    }

    if (!code || !state) {
      return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // التحقق من state
    const { data: oauthState, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('platform', 'snapchat')
      .single();

    if (stateError || !oauthState) {
      console.error('Invalid OAuth state:', stateError);
      return NextResponse.json({ error: 'Invalid or expired state' }, { status: 400 });
    }

    // التحقق من انتهاء الصلاحية
    if (new Date(oauthState.expires_at) < new Date()) {
      // حذف state المنتهي
      await supabase.from('oauth_states').delete().eq('id', oauthState.id);
      return NextResponse.json({ error: 'OAuth state expired' }, { status: 400 });
    }

    const storeId = oauthState.store_id;
    const redirectUri = oauthState.redirect_uri;

    // حذف state بعد الاستخدام
    await supabase.from('oauth_states').delete().eq('id', oauthState.id);

    // تبديل الكود بالتوكنات
    const clientId = process.env.SNAPCHAT_CLIENT_ID!;
    const clientSecret = process.env.SNAPCHAT_CLIENT_SECRET!;

    const tokens = await exchangeCodeForToken({
      code,
      redirectUri,
      clientId,
      clientSecret,
    });

    // حفظ التوكنات
    await saveTokens(storeId, 'snapchat', {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scopes: tokens.scope ? tokens.scope.split(' ') : [],
    });

    // إعادة التوجيه إلى صفحة اختيار الحساب
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
    return NextResponse.redirect(`${baseUrl}/admin/store/${storeId}/integrations?platform=snapchat&step=select-account`);
  } catch (error) {
    console.error('Snapchat OAuth callback error:', error);
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
    return NextResponse.redirect(`${baseUrl}/admin/stores?error=snapchat_oauth_failed`);
  }
}
