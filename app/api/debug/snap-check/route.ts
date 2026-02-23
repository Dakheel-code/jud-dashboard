import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt, encrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';
const SNAPCHAT_TOKEN_URL = 'https://accounts.snapchat.com/login/oauth2/access_token';

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('s') || '9172d3a8-05cd-4143-b0bf-9514cc1e3fd6';
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: r } = await supabase.from('ad_platform_accounts').select('*').eq('store_id', storeId).eq('platform', 'snapchat').single();
  if (!r) return NextResponse.json({ error: 'no record' });

  const now = new Date();
  const expires = r.token_expires_at ? new Date(r.token_expires_at) : null;
  const tokenValid = expires ? expires > now : false;

  const result: any = {
    status: r.status,
    ad_account_id: r.ad_account_id,
    token_expires_at: r.token_expires_at,
    token_still_valid: tokenValid,
    has_access_token: !!r.access_token_enc,
    has_refresh_token: !!r.refresh_token_enc,
  };

  // محاولة فك تشفير التوكن الحالي
  if (r.access_token_enc) {
    try {
      const plain = decrypt(r.access_token_enc);
      result.access_token_decrypt_ok = true;
      result.access_token_prefix = plain.substring(0, 20) + '...';
      // اختبار التوكن مع Snapchat API
      const testRes = await fetch('https://adsapi.snapchat.com/v1/me', {
        headers: { Authorization: `Bearer ${plain}` }
      });
      result.snapchat_api_test = testRes.status;
      if (testRes.ok) {
        const data = await testRes.json();
        result.snapchat_me = data.me?.email || data.me?.display_name || 'ok';
      } else {
        result.snapchat_api_error = await testRes.text();
      }
    } catch (e: any) {
      result.access_token_decrypt_ok = false;
      result.decrypt_error = e.message;
    }
  }

  // محاولة تجديد التوكن
  if (r.refresh_token_enc) {
    try {
      const refreshPlain = decrypt(r.refresh_token_enc);
      result.refresh_token_decrypt_ok = true;
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshPlain,
        client_id: process.env.SNAPCHAT_CLIENT_ID!,
        client_secret: process.env.SNAPCHAT_CLIENT_SECRET!,
      });
      const refreshRes = await fetch(SNAPCHAT_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const refreshText = await refreshRes.text();
      result.refresh_http_status = refreshRes.status;
      if (refreshRes.ok) {
        const d = JSON.parse(refreshText);
        result.refresh_success = true;
        result.new_expires_in = d.expires_in;
        // حفظ التوكن الجديد مباشرة
        const newExp = new Date(Date.now() + d.expires_in * 1000);
        await supabase.from('ad_platform_accounts').update({
          access_token_enc: encrypt(d.access_token),
          refresh_token_enc: d.refresh_token ? encrypt(d.refresh_token) : r.refresh_token_enc,
          token_expires_at: newExp.toISOString(),
          status: 'connected',
          error_message: null,
        }).eq('store_id', storeId).eq('platform', 'snapchat');
        result.saved = true;
      } else {
        result.refresh_success = false;
        result.refresh_error = refreshText;
      }
    } catch (e: any) {
      result.refresh_token_decrypt_ok = false;
      result.refresh_decrypt_error = e.message;
    }
  }

  return NextResponse.json(result);
}
