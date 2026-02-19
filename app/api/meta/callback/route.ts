/**
 * GET /api/meta/callback?code=...&state=...
 * يستقبل OAuth callback من Meta، يستبدل code بـ long-lived token ويحفظه مشفّراً
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getMetaUser,
  META_REDIRECT_URI,
} from '@/lib/meta/client';
import { encryptToken } from '@/lib/meta/encryption';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// REDIRECT_BASE للتوجيه بعد الـ callback فقط — لا علاقة له بـ META_REDIRECT_URI
const REDIRECT_BASE = 'https://jud-dashboard.netlify.app';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  // المستخدم رفض الصلاحيات
  if (errorParam) {
    return NextResponse.redirect(`${REDIRECT_BASE}/admin/stores?meta_error=access_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${REDIRECT_BASE}/admin/stores?meta_error=missing_params`);
  }

  const supabase = getSupabase();

  // التحقق من state (CSRF)
  const { data: stateRow, error: stateErr } = await supabase
    .from('meta_oauth_states')
    .select('store_id, expires_at')
    .eq('state', state)
    .single();

  if (stateErr || !stateRow) {
    return NextResponse.redirect(`${REDIRECT_BASE}/admin/stores?meta_error=invalid_state`);
  }

  if (new Date(stateRow.expires_at) < new Date()) {
    await supabase.from('meta_oauth_states').delete().eq('state', state);
    return NextResponse.redirect(`${REDIRECT_BASE}/admin/stores?meta_error=state_expired`);
  }

  const storeId = stateRow.store_id;

  try {
    // 1) استبدال code بـ short-lived token
    //    redirect_uri يجب أن يطابق Meta Dashboard حرفياً
    const { access_token: shortToken } = await exchangeCodeForToken(code, META_REDIRECT_URI);

    // 2) حذف state بعد نجاح التبادل فقط (one-time use)
    await supabase.from('meta_oauth_states').delete().eq('state', state);

    // 3) تحويل إلى long-lived token (صالح ~60 يوم)
    const { access_token: longToken, expires_in } = await exchangeForLongLivedToken(shortToken);

    // 4) جلب معلومات المستخدم
    const metaUser = await getMetaUser(longToken);

    // 5) تشفير التوكن قبل الحفظ
    const encryptedToken = encryptToken(longToken);
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // 6) حفظ الاتصال في DB (upsert بناءً على store_id)
    const { error: upsertErr } = await supabase
      .from('store_meta_connections')
      .upsert({
        store_id:               storeId,
        meta_user_id:           metaUser.id,
        meta_user_name:         metaUser.name,
        access_token_encrypted: encryptedToken,
        token_expires_at:       expiresAt,
        status:                 'active',
        updated_at:             new Date().toISOString(),
      }, { onConflict: 'store_id' });

    if (upsertErr) throw new Error(upsertErr.message);

    // توجيه لصفحة المتجر مع إشارة نجاح الربط
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/store/${storeId}?meta_connected=1`
    );
  } catch (err: any) {
    // طباعة الخطأ كاملاً في Netlify Logs لتشخيص المشكلة
    console.error('Meta callback error:', err);
    return NextResponse.redirect(
      `${REDIRECT_BASE}/admin/stores?meta_error=token_exchange_failed`
    );
  }
}
