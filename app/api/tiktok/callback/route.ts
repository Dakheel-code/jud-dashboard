import { NextRequest, NextResponse } from 'next/server';
import { exchangeAuthCode } from '@/lib/tiktok';
import { createClient } from '@supabase/supabase-js';
import { saveTokens } from '@/lib/integrations/token-manager';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://jud-dashboard.netlify.app';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authCode = req.nextUrl.searchParams.get('auth_code');
  const storeId  = req.nextUrl.searchParams.get('state');

  if (!authCode || !storeId) {
    return NextResponse.redirect(`${APP_URL}/admin/campaigns?tiktok=error&reason=missing_params`);
  }

  try {
    const tokenRes = await exchangeAuthCode(authCode);

    if (tokenRes.code !== 0) {
      return NextResponse.redirect(
        `${APP_URL}/admin/campaigns?tiktok=error&reason=${encodeURIComponent(tokenRes.message)}`
      );
    }

    const { access_token, refresh_token, advertiser_ids } = tokenRes.data;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // تحويل storeId من store_url إلى UUID إذا لزم
    let resolvedStoreId = storeId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
    if (!isUuid) {
      const { data: storeRow } = await supabase
        .from('stores').select('id').eq('store_url', storeId).single();
      if (storeRow?.id) resolvedStoreId = storeRow.id;
    }

    // حفظ التوكن في ad_platform_accounts مشفراً (النظام الجديد)
    await saveTokens(resolvedStoreId, 'tiktok', {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresIn: 86400, // TikTok tokens صلاحيتها 24 ساعة
    });

    // الاحتفاظ بـ tiktok_connections للتوافق مع باقي الكود (advertiser_ids)
    await supabase.from('tiktok_connections').upsert(
      advertiser_ids.map((id: string) => ({
        store_id: resolvedStoreId,
        app_id: process.env.TIKTOK_APP_ID!,
        advertiser_id: id,
        access_token: '***ENCRYPTED***',
        is_active: true,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'store_id,advertiser_id' }
    );

    // إعادة لصفحة اختيار الحساب الإعلاني مع UUID
    return NextResponse.redirect(
      `${APP_URL}/admin/integrations/tiktok/select?storeId=${resolvedStoreId}`
    );
  } catch (error: any) {
    console.error('[TikTok Callback]', error);
    return NextResponse.redirect(
      `${APP_URL}/admin/campaigns?tiktok=error&reason=server_error`
    );
  }
}
