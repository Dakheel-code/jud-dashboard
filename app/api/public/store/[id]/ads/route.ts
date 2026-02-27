import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getValidAccessToken } from '@/lib/integrations/token-manager';

export const dynamic = 'force-dynamic';

const SNAPCHAT_API_URL = 'https://adsapi.snapchat.com/v1';
const USD_TO_SAR = 3.75;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getDates(range: string) {
  const days = range === '1d' ? 1 : range === '30d' ? 30 : range === '90d' ? 90 : 7;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startStr: start.toISOString().split('T')[0],
    endStr:   end.toISOString().split('T')[0],
  };
}

// ─── Snapchat: نفس منطق /api/stores/[storeId]/snapchat/campaigns ────────────
async function getSnapchatData(storeId: string, range: string, adAccountId: string) {
  try {
    const accessToken = await getValidAccessToken(storeId, 'snapchat');
    if (!accessToken) return null;

    const { startStr, endStr } = getDates(range);
    const startTime = `${startStr}T00:00:00.000-00:00`;
    const endTime   = `${endStr}T23:59:59.999-00:00`;

    const supabase = getSupabase();
    const { data: integration } = await supabase
      .from('ad_platform_accounts')
      .select('currency')
      .eq('store_id', storeId)
      .eq('platform', 'snapchat')
      .single();

    const currency = integration?.currency || 'USD';
    const convRate = currency === 'USD' ? USD_TO_SAR : 1;

    // جلب spend على مستوى الحساب
    const accStatsUrl = `${SNAPCHAT_API_URL}/adaccounts/${adAccountId}/stats?granularity=TOTAL&fields=spend,impressions,swipes,conversion_purchases,conversion_purchases_value&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}&breakdown=campaign`;
    const headers = { Authorization: `Bearer ${accessToken}` };
    const res = await fetch(accStatsUrl, { headers });

    if (!res.ok) return { spend: 0, orders: 0, sales: 0 };

    const data = await res.json();
    const rows = data?.total_stats?.[0]?.total_stat?.breakdown_stats?.campaign ?? [];

    let spend = 0, orders = 0, sales = 0;
    for (const row of rows) {
      const s = row?.stats ?? {};
      spend  += (s.spend || 0) / 1_000_000;
      orders += (s.conversion_purchases || 0);
      sales  += (s.conversion_purchases_value || 0) / 1_000_000;
    }

    // fallback: account-level spend
    if (spend === 0) {
      const accLevel = await fetch(`${SNAPCHAT_API_URL}/adaccounts/${adAccountId}/stats?granularity=TOTAL&fields=spend&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`, { headers });
      if (accLevel.ok) {
        const d = await accLevel.json();
        const s = d?.total_stats?.[0]?.total_stat?.stats ?? {};
        spend = (s.spend || 0) / 1_000_000;
      }
    }

    return {
      spend:  Math.round(spend  * convRate),
      orders: Math.round(orders),
      sales:  Math.round(sales  * convRate),
    };
  } catch { return null; }
}

// ─── TikTok: من tiktok_reports_cache (نفس ما تستخدمه الصفحة الإدارية) ────────
async function getTikTokData(storeId: string, startStr: string, endStr: string) {
  try {
    const supabase = getSupabase();
    const { data: cache } = await supabase
      .from('tiktok_reports_cache')
      .select('spend, conversions, report_data')
      .eq('store_id', storeId)
      .gte('report_date', startStr)
      .lte('report_date', endStr);

    const spend  = (cache ?? []).reduce((s, r) => s + (r.spend || 0), 0);
    const orders = (cache ?? []).reduce((s, r) => s + (r.conversions || 0), 0);
    const sales  = (cache ?? []).reduce((s, r) => {
      const roas = parseFloat(r.report_data?.metrics?.complete_payment_roas ?? '0');
      return s + (r.spend || 0) * roas;
    }, 0);

    return {
      spend:  Math.round(spend),
      orders: Math.round(orders),
      sales:  Math.round(sales),
    };
  } catch { return { spend: 0, orders: 0, sales: 0 }; }
}

// ─── Meta: من meta_insights_cache ──────────────────────────────────────────
async function getMetaData(storeId: string, startStr: string, endStr: string) {
  try {
    const supabase = getSupabase();
    const { data: cache } = await supabase
      .from('meta_insights_cache')
      .select('spend, conversions, date_start, date_stop')
      .eq('store_id', storeId)
      .is('ad_id', null)
      .gte('date_start', startStr)
      .lte('date_stop', endStr);

    const spend  = (cache ?? []).reduce((s, r) => s + Number(r.spend || 0), 0);
    const orders = (cache ?? []).reduce((s, r) => s + Number(r.conversions || 0), 0);

    return { spend: Math.round(spend), orders: Math.round(orders), sales: 0 };
  } catch { return { spend: 0, orders: 0, sales: 0 }; }
}

// ─── GET /api/public/store/[id]/ads ──────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();
  const storeId  = params.id;
  const range    = req.nextUrl.searchParams.get('range') || '7d';
  const { startStr, endStr } = getDates(range);

  // ─── 1. جلب المنصات المتصلة من 3 مصادر (نفس integrations/status) ──────────
  const [
    { data: adAccounts },
    { data: metaConn },
    { data: tiktokOld },
  ] = await Promise.all([
    supabase
      .from('ad_platform_accounts')
      .select('platform, ad_account_id, ad_account_name')
      .eq('store_id', storeId),
    supabase
      .from('store_meta_connections')
      .select('ad_account_id, ad_account_name, status')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('tiktok_connections')
      .select('advertiser_id, advertiser_name')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .limit(1)
      .single(),
  ]);

  const platformMap: Record<string, { ad_account_id: string; account_name: string }> = {};

  for (const acc of (adAccounts ?? [])) {
    if (acc.ad_account_id && !platformMap[acc.platform]) {
      platformMap[acc.platform] = {
        ad_account_id: acc.ad_account_id,
        account_name:  acc.ad_account_name || acc.ad_account_id,
      };
    }
  }
  if (metaConn?.ad_account_id && !platformMap['meta']) {
    platformMap['meta'] = {
      ad_account_id: metaConn.ad_account_id,
      account_name:  metaConn.ad_account_name || metaConn.ad_account_id,
    };
  }
  if (tiktokOld?.advertiser_id && !platformMap['tiktok']) {
    platformMap['tiktok'] = {
      ad_account_id: tiktokOld.advertiser_id,
      account_name:  tiktokOld.advertiser_name || tiktokOld.advertiser_id,
    };
  }

  if (Object.keys(platformMap).length === 0) {
    return NextResponse.json({ platforms: [], summary: null, range, start: startStr, end: endStr });
  }

  // ─── 2. جلب بيانات الأداء لكل منصة بنفس الطريقة التي تستخدمها الصفحة الإدارية
  const results: any[] = [];

  for (const [platform, info] of Object.entries(platformMap)) {
    let perf = { spend: 0, orders: 0, sales: 0 };

    if (platform === 'snapchat') {
      const d = await getSnapchatData(storeId, range, info.ad_account_id);
      if (d) perf = d;
    } else if (platform === 'tiktok') {
      perf = await getTikTokData(storeId, startStr, endStr);
    } else if (platform === 'meta') {
      perf = await getMetaData(storeId, startStr, endStr);
    }

    const roas = perf.spend > 0 ? Math.round((perf.sales / perf.spend) * 100) / 100 : 0;
    results.push({
      platform,
      account_name: info.account_name,
      spend:  perf.spend,
      orders: perf.orders,
      sales:  perf.sales,
      roas,
    });
  }

  // ─── 3. الملخص الإجمالي ──────────────────────────────────────────────────
  const total = results.reduce(
    (acc, r) => ({ spend: acc.spend + r.spend, orders: acc.orders + r.orders, sales: acc.sales + r.sales }),
    { spend: 0, orders: 0, sales: 0 }
  );
  const summaryRoas = total.spend > 0 ? Math.round((total.sales / total.spend) * 100) / 100 : 0;

  return NextResponse.json({
    platforms: results,
    summary:   { ...total, roas: summaryRoas },
    range,
    start: startStr,
    end:   endStr,
  });
}
