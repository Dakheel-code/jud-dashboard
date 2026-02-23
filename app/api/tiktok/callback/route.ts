import { NextRequest, NextResponse } from 'next/server';
import { exchangeAuthCode } from '@/lib/tiktok';
import { saveTokens } from '@/lib/integrations/token-manager';
import { encrypt } from '@/lib/encryption';
import { createClient } from '@supabase/supabase-js';

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

    const { access_token, advertiser_ids } = tokenRes.data;

    // حفظ التوكن في ad_platform_accounts (نفس جدول Snapchat)
    // TikTok لا يُرجع expires_in — نضع 30 يوم افتراضي
    const THIRTY_DAYS = 30 * 24 * 60 * 60;
    await saveTokens(storeId, 'tiktok', {
      accessToken: access_token,
      expiresIn: THIRTY_DAYS,
      externalUserId: advertiser_ids?.[0] || undefined,
    });

    // حفظ قائمة advertiser_ids في جدول مساعد للاختيار لاحقاً
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase.from('tiktok_connections').upsert(
      advertiser_ids.map((id: string) => ({
        store_id: storeId,
        app_id: process.env.TIKTOK_APP_ID!,
        advertiser_id: id,
        access_token_enc: encrypt(access_token),
        is_active: true,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'store_id,advertiser_id' }
    );

    // إعادة لصفحة اختيار الحساب الإعلاني
    return NextResponse.redirect(
      `${APP_URL}/admin/integrations/tiktok/select?storeId=${storeId}`
    );
  } catch (error: any) {
    console.error('[TikTok Callback]', error);
    return NextResponse.redirect(
      `${APP_URL}/admin/campaigns?tiktok=error&reason=server_error`
    );
  }
}
