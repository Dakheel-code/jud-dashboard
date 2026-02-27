import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/public/store/[id]/ads
// يُرجع ملخص الحملات الإعلانية من كل منصة للمتجر (بدون auth)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase  = getSupabase();
  const storeId   = params.id;
  const range     = req.nextUrl.searchParams.get('range') || '7d';

  // حساب التواريخ
  const days  = range === '1d' ? 1 : range === '30d' ? 30 : range === '90d' ? 90 : 7;
  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const startStr = start.toISOString().split('T')[0];
  const endStr   = end.toISOString().split('T')[0];

  // جلب المنصات من ad_platform_accounts
  const { data: platformAccounts } = await supabase
    .from('ad_platform_accounts')
    .select('platform, ad_account_id, ad_account_name, status')
    .eq('store_id', storeId)
    .in('status', ['connected', 'active']);

  // جلب المنصات من platform_tokens (Meta, Snapchat, TikTok)
  const { data: tokens } = await supabase
    .from('platform_tokens')
    .select('platform, ad_account_id, ad_account_name')
    .eq('store_id', storeId);

  // دمج المصدرين — منع التكرار بالمنصة
  const seenPlatforms = new Set<string>();
  const platforms: { platform: string; ad_account_id: string; ad_account_name: string }[] = [];

  for (const p of (platformAccounts ?? [])) {
    if (!seenPlatforms.has(p.platform)) {
      seenPlatforms.add(p.platform);
      platforms.push({ platform: p.platform, ad_account_id: p.ad_account_id, ad_account_name: p.ad_account_name });
    }
  }
  for (const t of (tokens ?? [])) {
    if (!seenPlatforms.has(t.platform)) {
      seenPlatforms.add(t.platform);
      platforms.push({ platform: t.platform, ad_account_id: t.ad_account_id || '', ad_account_name: t.ad_account_name || t.ad_account_id || t.platform });
    }
  }

  if (platforms.length === 0) {
    return NextResponse.json({ platforms: [], summary: null, range, start: startStr, end: endStr });
  }

  const results: any[] = [];

  for (const p of platforms) {
    // جلب كاش TikTok إذا كانت المنصة TikTok
    if (p.platform === 'tiktok') {
      const { data: cache } = await supabase
        .from('tiktok_reports_cache')
        .select('report_date, spend, impressions, clicks, conversions, cost_per_conversion, report_data')
        .eq('store_id', storeId)
        .gte('report_date', startStr)
        .lte('report_date', endStr);

      if (cache && cache.length > 0) {
        const spend       = cache.reduce((s, r) => s + (r.spend || 0), 0);
        const conversions = cache.reduce((s, r) => s + (r.conversions || 0), 0);
        // revenue = spend * roas من report_data
        const revenue = cache.reduce((s, r) => {
          const roas = r.report_data?.metrics?.complete_payment_roas ?? 0;
          return s + (r.spend || 0) * parseFloat(roas);
        }, 0);
        results.push({
          platform: 'tiktok',
          account_name: p.ad_account_name || p.ad_account_id,
          spend:   Math.round(spend),
          orders:  Math.round(conversions),
          sales:   Math.round(revenue),
          roas:    spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
          status:  'connected',
        });
      } else {
        results.push({ platform: 'tiktok', account_name: p.ad_account_name || p.ad_account_id, spend: 0, orders: 0, sales: 0, roas: 0, status: 'no_data' });
      }
      continue;
    }

    // جلب كاش Snapchat
    if (p.platform === 'snapchat') {
      const { data: conn } = await supabase
        .from('platform_tokens')
        .select('ad_account_id, currency')
        .eq('store_id', storeId)
        .eq('platform', 'snapchat')
        .single();

      results.push({
        platform: 'snapchat',
        account_name: p.ad_account_name || conn?.ad_account_id || p.ad_account_id,
        spend: 0, orders: 0, sales: 0, roas: 0,
        status: 'connected',
        note: 'live',
      });
      continue;
    }

    // Meta + Google — بيانات مبسطة من الكاش إذا وُجد
    results.push({
      platform: p.platform,
      account_name: p.ad_account_name || p.ad_account_id,
      spend: 0, orders: 0, sales: 0, roas: 0,
      status: 'connected',
    });
  }

  // ملخص إجمالي
  const summary = results.reduce(
    (acc, r) => ({
      spend:  acc.spend  + (r.spend  || 0),
      orders: acc.orders + (r.orders || 0),
      sales:  acc.sales  + (r.sales  || 0),
    }),
    { spend: 0, orders: 0, sales: 0 }
  );
  const summaryRoas = summary.spend > 0 ? Math.round((summary.sales / summary.spend) * 100) / 100 : 0;

  return NextResponse.json({
    platforms: results,
    summary:   { ...summary, roas: summaryRoas },
    range,
    start: startStr,
    end:   endStr,
  });
}
