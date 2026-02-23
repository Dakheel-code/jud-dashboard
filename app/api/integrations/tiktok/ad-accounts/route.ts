/**
 * GET /api/integrations/tiktok/ad-accounts?storeId=...
 * جلب الحسابات الإعلانية المتاحة من TikTok
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/encryption';
import { getAuthorizedAdvertisers, getAdvertiserInfo } from '@/lib/tiktok';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId');
  if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // تحويل storeId إلى UUID إذا لزم
  let resolvedId = storeId;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
  if (!isUuid) {
    const { data: row } = await supabase.from('stores').select('id').eq('store_url', storeId).single();
    if (row?.id) resolvedId = row.id;
  }

  // جلب التوكن من ad_platform_accounts
  const { data: integration } = await supabase
    .from('ad_platform_accounts')
    .select('access_token_enc')
    .eq('store_id', resolvedId)
    .eq('platform', 'tiktok')
    .single();

  if (!integration?.access_token_enc) {
    return NextResponse.json({ error: 'Not connected', needsReauth: true }, { status: 401 });
  }

  const accessToken = decrypt(integration.access_token_enc);

  try {
    // جلب المعلنين المفوضين
    const authRes = await getAuthorizedAdvertisers(accessToken);

    if (authRes.code !== 0) {
      return NextResponse.json({ error: authRes.message || 'Failed to fetch advertisers', needsReauth: true }, { status: 401 });
    }

    const advertisers = authRes.data?.list || [];

    if (advertisers.length === 0) {
      return NextResponse.json({ success: true, accounts: [] });
    }

    // جلب تفاصيل المعلنين (الاسم والعملة)
    const ids = advertisers.map((a: any) => a.advertiser_id);
    let details: Record<string, any> = {};
    try {
      const infoRes = await getAdvertiserInfo(accessToken, ids);
      if (infoRes.code === 0 && infoRes.data?.list) {
        for (const adv of infoRes.data.list) {
          details[adv.advertiser_id] = adv;
        }
      }
    } catch {}

    const accounts = advertisers.map((a: any) => ({
      ad_account_id: a.advertiser_id,
      ad_account_name: details[a.advertiser_id]?.advertiser_name || a.advertiser_name || a.advertiser_id,
      currency: details[a.advertiser_id]?.currency || null,
      status: details[a.advertiser_id]?.status || null,
    }));

    return NextResponse.json({ success: true, accounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch ad accounts' }, { status: 500 });
  }
}
