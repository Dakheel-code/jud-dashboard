/**
 * GET /api/integrations/tiktok/ad-accounts?storeId=...
 * جلب الحسابات الإعلانية المتاحة من TikTok
 * التوكن يُجلب من tiktok_connections (يُحفظ في الـ callback)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

  // جلب التوكن من tiktok_connections (يُحفظ مباشرة في الـ callback)
  const { data: conn, error: connErr } = await supabase
    .from('tiktok_connections')
    .select('access_token, advertiser_id')
    .eq('store_id', resolvedId)
    .eq('is_active', true)
    .order('connected_at', { ascending: false })
    .limit(1)
    .single();

  if (connErr || !conn?.access_token) {
    return NextResponse.json({
      error: 'لا يوجد ربط نشط لـ TikTok. يرجى الربط أولاً.',
      needsReauth: true,
      debug: { resolvedId, connErr: connErr?.message }
    }, { status: 401 });
  }

  const accessToken = conn.access_token;

  try {
    // جلب المعلنين المفوضين
    const authRes = await getAuthorizedAdvertisers(accessToken);

    if (authRes.code !== 0) {
      return NextResponse.json({
        error: authRes.message || 'فشل في جلب الحسابات الإعلانية',
        needsReauth: true,
        tiktokCode: authRes.code
      }, { status: 401 });
    }

    const advertisers = authRes.data?.list || [];

    if (advertisers.length === 0) {
      // إذا لم يرجع قائمة، استخدم advertiser_id المحفوظ في الـ connection
      return NextResponse.json({
        success: true,
        accounts: [{ ad_account_id: conn.advertiser_id, ad_account_name: conn.advertiser_id }]
      });
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
