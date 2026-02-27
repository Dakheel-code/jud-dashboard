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
// يُرجع ملخص المنصات الإعلانية المرتبطة بالمتجر (بدون auth)
// يستخدم نفس منطق /api/integrations/status لجلب المنصات من 3 مصادر
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();
  const storeId  = params.id;
  const range    = req.nextUrl.searchParams.get('range') || '7d';

  // حساب التواريخ
  const days     = range === '1d' ? 1 : range === '30d' ? 30 : range === '90d' ? 90 : 7;
  const endDate  = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];
  const endStr   = endDate.toISOString().split('T')[0];

  // ─── جلب المنصات من 3 مصادر (نفس منطق integrations/status) ───────────────
  const [
    { data: adAccounts },
    { data: metaConn },
    { data: tiktokOld },
  ] = await Promise.all([
    supabase
      .from('ad_platform_accounts')
      .select('platform, ad_account_id, ad_account_name, status')
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

  // بناء خريطة المنصات — نفس منطق integrations/status
  const platformMap: Record<string, { ad_account_id: string; ad_account_name: string }> = {};

  // 1. من ad_platform_accounts
  for (const acc of (adAccounts ?? [])) {
    if (acc.ad_account_id && !platformMap[acc.platform]) {
      platformMap[acc.platform] = {
        ad_account_id:   acc.ad_account_id,
        ad_account_name: acc.ad_account_name || acc.ad_account_id,
      };
    }
  }

  // 2. Meta من store_meta_connections
  if (metaConn?.ad_account_id && !platformMap['meta']) {
    platformMap['meta'] = {
      ad_account_id:   metaConn.ad_account_id,
      ad_account_name: metaConn.ad_account_name || metaConn.ad_account_id,
    };
  }

  // 3. TikTok القديم من tiktok_connections
  if (tiktokOld?.advertiser_id && !platformMap['tiktok']) {
    platformMap['tiktok'] = {
      ad_account_id:   tiktokOld.advertiser_id,
      ad_account_name: tiktokOld.advertiser_name || tiktokOld.advertiser_id,
    };
  }

  if (Object.keys(platformMap).length === 0) {
    return NextResponse.json({ platforms: [], summary: null, range, start: startStr, end: endStr });
  }

  // ─── جلب بيانات الأداء لكل منصة ──────────────────────────────────────────
  const results: any[] = [];

  for (const [platform, info] of Object.entries(platformMap)) {

    // TikTok — من tiktok_reports_cache
    if (platform === 'tiktok') {
      const { data: cache } = await supabase
        .from('tiktok_reports_cache')
        .select('spend, conversions, report_data')
        .eq('store_id', storeId)
        .gte('report_date', startStr)
        .lte('report_date', endStr);

      const spend     = (cache ?? []).reduce((s, r) => s + (r.spend || 0), 0);
      const orders    = (cache ?? []).reduce((s, r) => s + (r.conversions || 0), 0);
      const revenue   = (cache ?? []).reduce((s, r) => {
        const roas = parseFloat(r.report_data?.metrics?.complete_payment_roas ?? '0');
        return s + (r.spend || 0) * roas;
      }, 0);
      results.push({
        platform,
        account_name: info.ad_account_name,
        spend:  Math.round(spend),
        orders: Math.round(orders),
        sales:  Math.round(revenue),
        roas:   spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
      });
      continue;
    }

    // Meta — من meta_insights_cache
    if (platform === 'meta') {
      const { data: cache } = await supabase
        .from('meta_insights_cache')
        .select('spend, conversions, date_start, date_stop')
        .eq('store_id', storeId)
        .is('ad_id', null)           // إحصائيات الحساب كله (account level)
        .gte('date_start', startStr)
        .lte('date_stop', endStr);

      const spend  = (cache ?? []).reduce((s, r) => s + Number(r.spend  || 0), 0);
      const orders = (cache ?? []).reduce((s, r) => s + Number(r.conversions || 0), 0);
      results.push({
        platform,
        account_name: info.ad_account_name,
        spend:  Math.round(spend),
        orders: Math.round(orders),
        sales:  0,
        roas:   0,
      });
      continue;
    }

    // Snapchat + Google + غيرها — الحساب مرتبط، البيانات التفصيلية عبر الفريق
    results.push({
      platform,
      account_name: info.ad_account_name,
      spend:  0,
      orders: 0,
      sales:  0,
      roas:   0,
    });
  }

  // ─── الملخص الإجمالي ──────────────────────────────────────────────────────
  const total = results.reduce(
    (acc, r) => ({
      spend:  acc.spend  + (r.spend  || 0),
      orders: acc.orders + (r.orders || 0),
      sales:  acc.sales  + (r.sales  || 0),
    }),
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
