import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCampaignReport } from '@/lib/tiktok';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const storeId    = req.nextUrl.searchParams.get('store_id');
  const startDate  = req.nextUrl.searchParams.get('start_date');
  const endDate    = req.nextUrl.searchParams.get('end_date');
  const campaignId = req.nextUrl.searchParams.get('campaign_id');

  if (!storeId || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'store_id و start_date و end_date مطلوبة' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabase();

    // تحويل storeId إلى UUID إذا لزم
    let resolvedStoreId = storeId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
    if (!isUuid) {
      const { data: row } = await supabase.from('stores').select('id').eq('store_url', storeId).single();
      if (row?.id) resolvedStoreId = row.id;
    }

    // جلب التوكن من tiktok_connections (التوكن نص عادي بدون تشفير)
    let advertiser_id: string;
    let access_token: string;

    const { data: connection, error: connErr } = await supabase
      .from('tiktok_connections')
      .select('advertiser_id, access_token')
      .eq('store_id', resolvedStoreId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (connErr || !connection) {
      return NextResponse.json({ connected: false, error: 'لا يوجد ربط نشط' }, { status: 404 });
    }
    advertiser_id = connection.advertiser_id;
    access_token = connection.access_token;

    // جلب التقرير من TikTok API
    const campaignIds = campaignId ? [campaignId] : undefined;
    const apiRes = await getCampaignReport(access_token, advertiser_id, startDate, endDate, campaignIds);

    if (apiRes.code !== 0) {
      console.error('[TikTok Reports] خطأ API:', apiRes.message);
      return NextResponse.json({ error: apiRes.message }, { status: 500 });
    }

    const rows = apiRes.data?.list ?? [];

    // حساب الإجماليات
    const totals = rows.reduce(
      (acc, row) => {
        const m = row.metrics;
        const spend       = parseFloat(String(m.spend            ?? 0));
        const conversions = parseFloat(String(m.complete_payment ?? 0));
        const roas        = parseFloat(String((m as any).complete_payment_roas ?? 0));
        // revenue = spend × roas (الطريقة الصحيحة في TikTok API)
        const revenue     = spend * roas;
        acc.spend       += spend;
        acc.impressions += parseInt(String(m.impressions ?? 0), 10);
        acc.clicks      += parseInt(String(m.clicks      ?? 0), 10);
        acc.conversions += conversions;
        acc.revenue     += revenue;
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
    );

    // حساب المعدلات
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    const cost_per_conversion = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
    const roas = totals.spend > 0 && totals.revenue > 0 ? totals.revenue / totals.spend : 0;

    // حفظ في الكاش
    if (rows.length > 0) {
      const cacheRows = rows
        .filter((r) => r.dimensions.stat_time_day)
        .map((r) => ({
          store_id: storeId,
          advertiser_id,
          campaign_id: r.dimensions.campaign_id || null,
          report_date: r.dimensions.stat_time_day!,
          spend:                parseFloat(String(r.metrics.spend               ?? 0)),
          impressions:          parseInt(String(r.metrics.impressions            ?? 0), 10),
          clicks:               parseInt(String(r.metrics.clicks                ?? 0), 10),
          ctr:                  parseFloat(String(r.metrics.ctr                 ?? 0)),
          cpc:                  parseFloat(String(r.metrics.cpc                 ?? 0)),
          cpm:                  parseFloat(String(r.metrics.cpm                 ?? 0)),
          conversions:          parseInt(String(r.metrics.conversions           ?? 0), 10),
          cost_per_conversion:  parseFloat(String(r.metrics.cost_per_conversion ?? 0)),
          report_data: r,
          last_synced_at: new Date().toISOString(),
        }));

      await supabase
        .from('tiktok_reports_cache')
        .upsert(cacheRows, { onConflict: 'store_id,campaign_id,report_date' });
    }

    return NextResponse.json({
      report: rows,
      totals: { ...totals, ctr, cpc, cost_per_conversion, roas },
      period: { start_date: startDate, end_date: endDate },
      advertiser_id,
    });
  } catch (error: any) {
    console.error('[TikTok Reports] خطأ غير متوقع:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
