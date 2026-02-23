import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt, encrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

const SNAPCHAT_TOKEN_URL = 'https://accounts.snapchat.com/login/oauth2/access_token';

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId') || '9172d3a8-05cd-4143-b0bf-9514cc1e3fd6';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: record } = await supabase
    .from('ad_platform_accounts')
    .select('*')
    .eq('store_id', storeId)
    .eq('platform', 'snapchat')
    .single();

  if (!record) return NextResponse.json({ error: 'no record found' });

  const info: any = {
    status: record.status,
    ad_account_id: record.ad_account_id,
    token_expires_at: record.token_expires_at,
    has_access_token: !!record.access_token_enc,
    has_refresh_token: !!record.refresh_token_enc,
    client_id_set: !!process.env.SNAPCHAT_CLIENT_ID,
    client_secret_set: !!process.env.SNAPCHAT_CLIENT_SECRET,
  };

  // محاولة تجديد التوكن مباشرة
  if (record.refresh_token_enc) {
    try {
      const refreshToken = decrypt(record.refresh_token_enc);
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.SNAPCHAT_CLIENT_ID!,
        client_secret: process.env.SNAPCHAT_CLIENT_SECRET!,
      });
      const res = await fetch(SNAPCHAT_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const responseText = await res.text();
      info.refresh_status = res.status;
      info.refresh_ok = res.ok;
      if (res.ok) {
        const data = JSON.parse(responseText);
        info.new_token_received = !!data.access_token;
        info.new_expires_in = data.expires_in;
        // حفظ التوكن الجديد
        if (data.access_token) {
          const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);
          await supabase.from('ad_platform_accounts').update({
            access_token_enc: encrypt(data.access_token),
            refresh_token_enc: data.refresh_token ? encrypt(data.refresh_token) : record.refresh_token_enc,
            token_expires_at: newExpiresAt.toISOString(),
            status: 'connected',
            error_message: null,
          }).eq('store_id', storeId).eq('platform', 'snapchat');
          info.saved_to_db = true;
        }
      } else {
        info.refresh_error = responseText;
      }
    } catch (e: any) {
      info.refresh_exception = e.message;
    }
  }

  return NextResponse.json(info);
}
