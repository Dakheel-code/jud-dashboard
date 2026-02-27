import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

// ── Snapchat: يستدعي /api/stores/[storeId]/snapchat/campaigns مباشرة ─────────
async function snapchatPerf(storeId: string, range: string, baseUrl: string) {
  try {
    const url = `${baseUrl}/api/stores/${storeId}/snapchat/campaigns?range=${range}`;
    const res  = await fetch(url, { headers: { 'x-internal': '1' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return {
      spend:  Math.round(data.summary?.spend  || 0),
      orders: Math.round(data.summary?.orders || 0),
      sales:  Math.round(data.summary?.sales  || 0),
    };
  } catch { return null; }
}

// ── TikTok: من tiktok_reports_cache ─────────────────────────────────────────
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

// ── Meta: من meta_insights_cache ────────────────────────────────────────────
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
  const supabase             = getSupabase();
  const storeId              = params.id;
  const range                = req.nextUrl.searchParams.get('range') || '7d';
  const { startStr, endStr } = getDates(range);

  // base URL للاستدعاء الداخلي
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  // ── جلب المنصات من 3 مصادر ────────────────────────────────────────────────
  const [
    { data: adAccounts },
    { data: metaConn },
    { data: tiktokOld },
  ] = await Promise.all([
    supabase.from('ad_platform_accounts')
      .select('platform, ad_account_id, ad_account_name')
      .eq('store_id', storeId),
    supabase.from('store_meta_connections')
      .select('ad_account_id, ad_account_name')
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

  // ── جلب الأداء بالتوازي ───────────────────────────────────────────────────
  const perfList = await Promise.all(
    Object.entries(map).map(async ([platform, info]) => {
      let p = { spend: 0, orders: 0, sales: 0 };

      if (platform === 'snapchat') {
        const d = await snapchatPerf(storeId, range, baseUrl);
        if (d) p = d;
      } else if (platform === 'tiktok') {
        p = await tiktokPerf(storeId, startStr, endStr);
      } else if (platform === 'meta') {
        p = await metaPerf(storeId, startStr, endStr);
      }

      const roas = p.spend > 0 ? Math.round((p.sales / p.spend) * 100) / 100 : 0;
      return { platform, account_name: info.account_name, ...p, roas };
    })
  );

  // ── الملخص ────────────────────────────────────────────────────────────────
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
