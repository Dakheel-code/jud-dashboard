import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getValidAccessToken } from '@/lib/integrations/token-manager';

export const dynamic = 'force-dynamic';

const SNAPCHAT_API  = 'https://adsapi.snapchat.com/v1';
const USD_TO_SAR    = 3.75;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// range → { startStr, endStr }
function getDates(range: string) {
  const days  = range === '1d' ? 1 : range === '30d' ? 30 : range === '90d' ? 90 : 7;
  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startStr: start.toISOString().split('T')[0],
    endStr:   end.toISOString().split('T')[0],
  };
}

// ── Snapchat — نفس منطق /api/stores/[id]/snapchat/campaigns تماماً ──────────
async function snapchatPerf(storeId: string, adAccountId: string, range: string) {
  try {
    const token = await getValidAccessToken(storeId, 'snapchat');
    if (!token) return null;

    const supabase = getSupabase();
    const { data: acc } = await supabase
      .from('ad_platform_accounts')
      .select('currency')
      .eq('store_id', storeId)
      .eq('platform', 'snapchat')
      .single();

    const currency = acc?.currency || 'USD';
    const rate     = currency === 'USD' ? USD_TO_SAR : 1;

    const { startStr, endStr } = getDates(range);
    const st = `${startStr}T00:00:00.000-00:00`;
    const et = `${endStr}T23:59:59.999-00:00`;
    const h  = { Authorization: `Bearer ${token}` };

    // campaign-breakdown (نفس endpoint السائد)
    const url  = `${SNAPCHAT_API}/adaccounts/${adAccountId}/stats?granularity=TOTAL` +
                 `&fields=spend,conversion_purchases,conversion_purchases_value` +
                 `&start_time=${encodeURIComponent(st)}&end_time=${encodeURIComponent(et)}` +
                 `&breakdown=campaign`;
    const res  = await fetch(url, { headers: h });
    const data = await res.json();
    const rows: any[] = data?.total_stats?.[0]?.total_stat?.breakdown_stats?.campaign ?? [];

    let spend = 0, orders = 0, sales = 0;
    for (const r of rows) {
      const s = r?.stats ?? {};
      spend  += (s.spend  || 0) / 1_000_000;
      orders += (s.conversion_purchases || 0);
      sales  += (s.conversion_purchases_value || 0) / 1_000_000;
    }

    // fallback: account-level spend إذا الـ breakdown لم يُرجع شيئاً
    if (spend === 0) {
      const r2  = await fetch(`${SNAPCHAT_API}/adaccounts/${adAccountId}/stats?granularity=TOTAL&fields=spend&start_time=${encodeURIComponent(st)}&end_time=${encodeURIComponent(et)}`, { headers: h });
      const d2  = await r2.json();
      const s2  = d2?.total_stats?.[0]?.total_stat?.stats ?? {};
      spend     = (s2.spend || 0) / 1_000_000;
    }

    return {
      spend:  Math.round(spend  * rate),
      orders: Math.round(orders),
      sales:  Math.round(sales  * rate),
    };
  } catch { return null; }
}

// ── TikTok — من tiktok_reports_cache (نفس الصفحة الإدارية) ─────────────────
async function tiktokPerf(storeId: string, startStr: string, endStr: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('tiktok_reports_cache')
    .select('spend, conversions, report_data')
    .eq('store_id', storeId)
    .gte('report_date', startStr)
    .lte('report_date', endStr);

  const rows  = data ?? [];
  const spend = rows.reduce((s, r) => s + (r.spend || 0), 0);
  const orders= rows.reduce((s, r) => s + (r.conversions || 0), 0);
  const sales = rows.reduce((s, r) => {
    const roas = parseFloat(r.report_data?.metrics?.complete_payment_roas ?? '0');
    return s + (r.spend || 0) * roas;
  }, 0);
  return { spend: Math.round(spend), orders: Math.round(orders), sales: Math.round(sales) };
}

// ── Meta — من meta_insights_cache (نفس الصفحة الإدارية) ────────────────────
async function metaPerf(storeId: string, startStr: string, endStr: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('meta_insights_cache')
    .select('spend, conversions')
    .eq('store_id', storeId)
    .is('ad_id', null)
    .gte('date_start', startStr)
    .lte('date_stop', endStr);

  const rows  = data ?? [];
  const spend = rows.reduce((s, r) => s + Number(r.spend || 0), 0);
  const orders= rows.reduce((s, r) => s + Number(r.conversions || 0), 0);
  return { spend: Math.round(spend), orders: Math.round(orders), sales: 0 };
}

// ── GET /api/public/store/[id]/ads ───────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase               = getSupabase();
  const storeId                = params.id;
  const range                  = req.nextUrl.searchParams.get('range') || '7d';
  const { startStr, endStr }   = getDates(range);

  // ── 1. جلب المنصات من 3 مصادر — نفس منطق /api/integrations/status ────────
  const [
    { data: adAccounts },
    { data: metaConn },
    { data: tiktokOld },
  ] = await Promise.all([
    supabase.from('ad_platform_accounts')
      .select('platform, ad_account_id, ad_account_name')
      .eq('store_id', storeId),
    supabase.from('store_meta_connections')
      .select('ad_account_id, ad_account_name, status')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(1).single(),
    supabase.from('tiktok_connections')
      .select('advertiser_id, advertiser_name')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .limit(1).single(),
  ]);

  type PInfo = { ad_account_id: string; account_name: string };
  const map: Record<string, PInfo> = {};

  for (const a of (adAccounts ?? [])) {
    if (a.ad_account_id && !map[a.platform])
      map[a.platform] = { ad_account_id: a.ad_account_id, account_name: a.ad_account_name || a.ad_account_id };
  }
  if (metaConn?.ad_account_id && !map['meta'])
    map['meta'] = { ad_account_id: metaConn.ad_account_id, account_name: metaConn.ad_account_name || metaConn.ad_account_id };
  if (tiktokOld?.advertiser_id && !map['tiktok'])
    map['tiktok'] = { ad_account_id: tiktokOld.advertiser_id, account_name: tiktokOld.advertiser_name || tiktokOld.advertiser_id };

  if (!Object.keys(map).length)
    return NextResponse.json({ platforms: [], summary: null, range, start: startStr, end: endStr });

  // ── 2. جلب الأداء بالتوازي لكل المنصات ──────────────────────────────────
  const entries  = Object.entries(map);
  const perfList = await Promise.all(entries.map(async ([platform, info]) => {
    let p = { spend: 0, orders: 0, sales: 0 };
    if      (platform === 'snapchat') { const d = await snapchatPerf(storeId, info.ad_account_id, range); if (d) p = d; }
    else if (platform === 'tiktok')   p = await tiktokPerf(storeId, startStr, endStr);
    else if (platform === 'meta')     p = await metaPerf(storeId, startStr, endStr);
    const roas = p.spend > 0 ? Math.round((p.sales / p.spend) * 100) / 100 : 0;
    return { platform, account_name: info.account_name, ...p, roas };
  }));

  // ── 3. الملخص ────────────────────────────────────────────────────────────
  const total = perfList.reduce(
    (a, r) => ({ spend: a.spend + r.spend, orders: a.orders + r.orders, sales: a.sales + r.sales }),
    { spend: 0, orders: 0, sales: 0 }
  );
  const roas = total.spend > 0 ? Math.round((total.sales / total.spend) * 100) / 100 : 0;

  return NextResponse.json({
    platforms: perfList,
    summary:   { ...total, roas },
    range,
    start: startStr,
    end:   endStr,
  });
}
