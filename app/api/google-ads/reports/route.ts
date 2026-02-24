import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCampaignReport, microsToAmount } from '@/lib/google-ads';
import type { GoogleAdsConnection } from '@/types/google-ads';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { searchParams } = new URL(req.url);
    const store_id   = searchParams.get('store_id');
    const start_date = searchParams.get('start_date');
    const end_date   = searchParams.get('end_date');
    const campaign_id = searchParams.get('campaign_id');

    if (!store_id || !start_date || !end_date) {
      return NextResponse.json({ error: 'store_id, start_date, end_date مطلوبة' }, { status: 400 });
    }

    // جلب الربط النشط
    const { data: connData, error: connError } = await supabase
      .from('google_ads_connections')
      .select('*')
      .eq('store_id', store_id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (connError || !connData) {
      return NextResponse.json({ connected: false }, { status: 404 });
    }

    const connection = connData as GoogleAdsConnection;

    // جلب التقرير من API
    const rows = await getCampaignReport(connection, start_date, end_date);

    // حساب الإجماليات
    let totalCostMicros = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;
    let totalConversionsValue = 0;

    const report = rows.map((r: any) => {
      const costMicros         = Number(r.metrics?.costMicros ?? 0);
      const impressions        = Number(r.metrics?.impressions ?? 0);
      const clicks             = Number(r.metrics?.clicks ?? 0);
      const conversions        = Number(r.metrics?.conversions ?? 0);
      const conversionsValue   = Number(r.metrics?.conversionsValue ?? 0);

      totalCostMicros       += costMicros;
      totalImpressions      += impressions;
      totalClicks           += clicks;
      totalConversions      += conversions;
      totalConversionsValue += conversionsValue;

      return {
        campaign_id:   String(r.campaign?.id ?? ''),
        campaign_name: r.campaign?.name ?? '',
        date:          r.segments?.date ?? '',
        cost:          microsToAmount(costMicros),
        impressions,
        clicks,
        conversions,
        conversions_value: conversionsValue,
        ctr:           Number(r.metrics?.ctr ?? 0),
        avg_cpc:       microsToAmount(r.metrics?.averageCpc ?? 0),
        cost_per_conversion: microsToAmount(r.metrics?.costPerConversion ?? 0),
      };
    });

    const totalCost = microsToAmount(totalCostMicros);
    const roas = totalCost > 0 && totalConversionsValue > 0 ? totalConversionsValue / totalCost : 0;
    const totals = {
      cost:               totalCost,
      impressions:        totalImpressions,
      clicks:             totalClicks,
      conversions:        totalConversions,
      conversions_value:  totalConversionsValue,
      roas,
      ctr:                totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      avg_cpc:            totalClicks > 0 ? totalCost / totalClicks : 0,
      cost_per_conversion: totalConversions > 0 ? totalCost / totalConversions : 0,
    };

    // حفظ في الكاش (مجمّع لكل الحملات)
    if (rows.length > 0) {
      await supabase
        .from('google_ads_reports_cache')
        .upsert({
          store_id,
          customer_id: connection.customer_id,
          campaign_id: campaign_id ?? null,
          report_date: end_date,
          cost_micros: totalCostMicros,
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: totalConversions,
          ctr: totals.ctr,
          average_cpc_micros: totalClicks > 0 ? Math.round(totalCostMicros / totalClicks) : 0,
          cost_per_conversion_micros: totalConversions > 0 ? Math.round(totalCostMicros / totalConversions) : 0,
          report_data: { rows: report.slice(0, 100) },
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'store_id,campaign_id,report_date' });
    }

    return NextResponse.json({ report, totals, period: { start_date, end_date } });
  } catch (e: any) {
    console.error('Google Ads reports error:', e);
    return NextResponse.json({ error: e.message || 'خطأ في جلب التقارير' }, { status: 500 });
  }
}
