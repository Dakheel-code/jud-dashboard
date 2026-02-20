import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { exchangeAuthCode, getAdvertiserInfo } from '@/lib/tiktok';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://jud-dashboard.netlify.app';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const authCode = req.nextUrl.searchParams.get('auth_code');
  const storeId  = req.nextUrl.searchParams.get('state');

  if (!authCode || !storeId) {
    return NextResponse.redirect(
      `${APP_URL}/admin/stores/${storeId || ''}?tiktok=error&reason=missing_params`
    );
  }

  try {
    // تبادل كود المصادقة بتوكن
    const tokenRes = await exchangeAuthCode(authCode);

    if (tokenRes.code !== 0) {
      console.error('[TikTok Callback] خطأ في التوكن:', tokenRes.message);
      return NextResponse.redirect(
        `${APP_URL}/admin/stores/${storeId}?tiktok=error&reason=${encodeURIComponent(tokenRes.message)}`
      );
    }

    const { access_token, advertiser_ids } = tokenRes.data;
    const appId = process.env.TIKTOK_APP_ID!;
    const supabase = getSupabase();

    // جلب معلومات المعلنين (غير حرجة)
    let advertiserNames: Record<string, string> = {};
    try {
      const infoRes = await getAdvertiserInfo(access_token, advertiser_ids);
      if (infoRes.code === 0 && infoRes.data?.list) {
        for (const adv of infoRes.data.list) {
          advertiserNames[adv.advertiser_id] = adv.advertiser_name;
        }
      }
    } catch (e) {
      console.warn('[TikTok Callback] تعذر جلب معلومات المعلنين:', e);
    }

    // حفظ كل حساب إعلاني في قاعدة البيانات
    for (const advertiserId of advertiser_ids) {
      const { error } = await supabase
        .from('tiktok_connections')
        .upsert(
          {
            store_id: storeId,
            app_id: appId,
            advertiser_id: advertiserId,
            advertiser_name: advertiserNames[advertiserId] || null,
            access_token,
            is_active: true,
            connected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'store_id,advertiser_id' }
        );

      if (error) {
        console.error('[TikTok Callback] خطأ في حفظ الاتصال:', error);
      }
    }

    return NextResponse.redirect(`${APP_URL}/admin/stores/${storeId}?tiktok=connected`);
  } catch (error: any) {
    console.error('[TikTok Callback] خطأ غير متوقع:', error);
    return NextResponse.redirect(
      `${APP_URL}/admin/stores/${storeId}?tiktok=error&reason=server_error`
    );
  }
}
