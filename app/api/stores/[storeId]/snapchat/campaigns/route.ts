/**
 * GET /api/stores/[storeId]/snapchat/campaigns
 *
 * Endpoint نظيف لجلب حملات Snapchat مع الإحصائيات
 * يستخدم Campaign-level reporting
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/integrations/token-manager';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SNAPCHAT_API_URL = 'https://adsapi.snapchat.com/v1';

// سعر صرف الدولار إلى الريال السعودي
const USD_TO_SAR = 3.75;

// Snapchat يقبل صيغة YYYY-MM-DD مع وقت كامل
function toSnapDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toSnapStartTime(date: Date): string {
  return `${toSnapDate(date)}T00:00:00.000-00:00`;
}

// Snapchat يتطلب end_time أن يكون بداية ساعة
// نستخدم اليوم التالي 00:00:00 (exclusive end)
function toSnapEndTime(date: Date): string {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return `${toSnapDate(next)}T00:00:00.000-00:00`;
}

/**
 * حساب تاريخ البداية والنهاية حسب الفترة (بتوقيت UTC)
 */
function getDateRange(range: string): { start: Date; end: Date } {
  const now = new Date();
  // اليوم الحالي بتوقيت UTC
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  if (range === 'today') {
    return { start: todayUTC, end: todayUTC };
  }

  if (range === 'yesterday') {
    const yesterday = new Date(todayUTC);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return { start: yesterday, end: yesterday };
  }

  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  // end = أمس (آخر يوم مكتمل)
  const end = new Date(todayUTC);
  end.setUTCDate(end.getUTCDate() - 1);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);

  return { start, end };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const startTime = Date.now();

  try {
    let storeId = params.storeId;
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '30d';
    const debug = searchParams.get('debug') === 'true';


    // التحقق من المتغيرات البيئية
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database not configured',
        },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // إذا لم يكن UUID، نحوّله إلى UUID عبر store_url
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
    if (!isUuid) {
      const { data: storeRow } = await supabase
        .from('stores')
        .select('id')
        .eq('store_url', storeId)
        .single();
      if (storeRow?.id) storeId = storeRow.id;
    }

    // جلب بيانات الربط من جدول ad_platform_accounts (نفس الجدول الذي يستخدمه token-manager)
    const { data: integration, error: integrationError } = await supabase
      .from('ad_platform_accounts')
      .select('*')
      .eq('store_id', storeId)
      .eq('platform', 'snapchat')
      .single();


    if (integrationError || !integration) {
      return NextResponse.json(
        {
          success: false,
          error: 'Snapchat not connected',
          needs_connection: true,
          debug: { storeId, error: integrationError?.message },
        },
        { status: 200 } // 200 بدلاً من 404 لتجنب الخطأ في الواجهة
      );
    }

    const adAccountId = integration.ad_account_id;
    if (!adAccountId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No ad account selected',
          needs_account_selection: true,
        },
        { status: 400 }
      );
    }

    // جلب توكن صالح (مع refresh تلقائي)
    const accessToken = await getValidAccessToken(storeId, 'snapchat');
    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Token expired or invalid',
          needs_reauth: true,
        },
        { status: 401 }
      );
    }

    const headers = { Authorization: `Bearer ${accessToken}` };

    // حساب التواريخ
    const { start: startDate, end: endDate } = getDateRange(range);
    const normalizedStart = toSnapStartTime(startDate);
    const normalizedEnd   = toSnapEndTime(endDate);

    // ========== الخطوة 1: جلب الحملات ==========
    const campaignsUrl = `${SNAPCHAT_API_URL}/adaccounts/${encodeURIComponent(
      adAccountId
    )}/campaigns?limit=100`;
    const campaignsResponse = await fetch(campaignsUrl, { headers });

    if (!campaignsResponse.ok) {
      const errorData = await campaignsResponse.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch campaigns',
          http_status: campaignsResponse.status,
          snapchat_error: errorData,
        },
        { status: campaignsResponse.status }
      );
    }

    const campaignsData = await campaignsResponse.json();
    const campaigns = campaignsData.campaigns || [];

    // استخراج بيانات الحملات
    const campaignsList: any[] = [];
    const campaignIds: string[] = [];

    campaigns.forEach((item: any) => {
      const campaign = item.campaign;
      if (campaign && campaign.id) {
        campaignIds.push(campaign.id);
        campaignsList.push({
          campaign_id: campaign.id,
          campaign_name: campaign.name || 'Unknown',
          status: campaign.status || 'UNKNOWN',
        });
      }
    });

    if (campaignsList.length === 0) {
      return NextResponse.json({
        success: true,
        currency: integration.currency || 'SAR',
        time: {
          start: normalizedStart,
          end: normalizedEnd,
          effective_end: normalizedEnd,
          finalized_end: null,
        },
        summary: { spend: 0, orders: 0, sales: 0, roas: 0 },
        campaigns: [],
        message: 'No campaigns found',
      });
    }

    // ========== الخطوة 2: جلب Stats على مستوى Campaign ==========
    const fields =
      'spend,impressions,swipes,conversion_purchases,conversion_purchases_value';

    const statsUrl = `${SNAPCHAT_API_URL}/adaccounts/${encodeURIComponent(adAccountId)}/stats?granularity=TOTAL&fields=${fields}&start_time=${encodeURIComponent(normalizedStart)}&end_time=${encodeURIComponent(normalizedEnd)}&breakdown=campaign`;

    const statsResponse = await fetch(statsUrl, { headers });
    const statsRawText = await statsResponse.text();
    let statsData: any = {};
    let statsRawDebug: any = null;
    try { statsData = JSON.parse(statsRawText); statsRawDebug = statsData; } catch { statsRawDebug = statsRawText; }

    // معالجة الإحصائيات
    const campaignStatsMap: Record<string, any> = {};
    let finalizedDataEndTime: string | null = null;

    if (statsResponse.ok) {
      /**
       * ✅ الشكل الحقيقي اللي رجع عندك:
       * statsData.total_stats[0].total_stat.breakdown_stats.campaign = [{ id, stats: {...} }]
       */
      const campaignRows =
        statsData?.total_stats?.[0]?.total_stat?.breakdown_stats?.campaign || [];

      if (campaignRows.length > 0) {
        campaignRows.forEach((row: any) => {
          const campaignId = row?.id;
          const s = row?.stats || {};
          if (!campaignId) return;

          campaignStatsMap[campaignId] = {
            spend: (s.spend || 0) / 1_000_000,
            impressions: s.impressions || 0,
            swipes: s.swipes || 0,
            orders: s.conversion_purchases || 0,
            sales: (s.conversion_purchases_value || 0) / 1_000_000,
          };
        });

        finalizedDataEndTime =
          statsData?.total_stats?.[0]?.total_stat?.finalized_data_end_time ||
          null;
      }

      /**
       * ✅ fallback إضافي (لو Snapchat رجّع شكل مختلف)
       * - timeseries_stats
       * - total_stats بدون breakdown (حسب بعض الحالات)
       */
      if (Object.keys(campaignStatsMap).length === 0 && statsData.timeseries_stats) {
        statsData.timeseries_stats.forEach((item: any) => {
          const timeseriesStat = item.timeseries_stat;
          const campaignId = timeseriesStat?.id;
          const timeseries = timeseriesStat?.timeseries || [];

          if (campaignId && timeseries.length > 0) {
            let totalStats = {
              spend: 0,
              impressions: 0,
              swipes: 0,
              orders: 0,
              sales: 0,
            };

            timeseries.forEach((t: any) => {
              const s = t.stats || {};
              totalStats.spend += (s.spend || 0) / 1_000_000;
              totalStats.impressions += s.impressions || 0;
              totalStats.swipes += s.swipes || 0;
              totalStats.orders += s.conversion_purchases || 0;
              totalStats.sales += (s.conversion_purchases_value || 0) / 1_000_000;
            });

            campaignStatsMap[campaignId] = totalStats;
          }

          if (timeseriesStat?.finalized_data_end_time) {
            finalizedDataEndTime = timeseriesStat.finalized_data_end_time;
          }
        });
      }

      if (Object.keys(campaignStatsMap).length === 0 && statsData.total_stats) {
        statsData.total_stats.forEach((item: any) => {
          const totalStat = item.total_stat;
          if (totalStat?.finalized_data_end_time) {
            finalizedDataEndTime = totalStat.finalized_data_end_time;
          }
        });
      }
    }

    // ========== جلب spend على مستوى الحساب — Snapchat يدعم spend فقط على هذا المستوى ==========
    let accountSpend: number | null = null;
    {
      const accStatsUrl = `${SNAPCHAT_API_URL}/adaccounts/${encodeURIComponent(adAccountId)}/stats?granularity=TOTAL&fields=spend&start_time=${encodeURIComponent(normalizedStart)}&end_time=${encodeURIComponent(normalizedEnd)}`;
      try {
        const accRes = await fetch(accStatsUrl, { headers });
        if (accRes.ok) {
          const accData = await accRes.json();
          const s = accData?.total_stats?.[0]?.total_stat?.stats
                 || accData?.total_stats?.[0]?.stats
                 || null;
          if (s?.spend != null) {
            accountSpend = (s.spend || 0) / 1_000_000;
          }
        }
      } catch { /* silent */ }
    }

    // ========== الخطوة 3: دمج الحملات مع الإحصائيات ==========
    // تحديد معامل التحويل - إذا العملة USD نحولها لـ SAR
    const accountCurrency = integration.currency || 'USD';
    const conversionRate = accountCurrency === 'USD' ? USD_TO_SAR : 1;
    const displayCurrency = 'SAR'; // دائماً نعرض بالريال

    const campaignsWithStats = campaignsList.map((campaign) => {
      const stats = campaignStatsMap[campaign.campaign_id] || {
        spend: 0,
        impressions: 0,
        swipes: 0,
        orders: 0,
        sales: 0,
      };

      // تحويل المبالغ إلى الريال إذا كانت بالدولار
      const spendSAR = (stats.spend || 0) * conversionRate;
      const salesSAR = (stats.sales || 0) * conversionRate;

      const cpa =
        stats.orders > 0
          ? Math.round((spendSAR / stats.orders) * 100) / 100
          : 0;

      const roas =
        spendSAR > 0
          ? Math.round((salesSAR / spendSAR) * 100) / 100
          : 0;

      return {
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        status: campaign.status,
        spend: Math.round(spendSAR * 100) / 100,
        impressions: stats.impressions || 0,
        swipes: stats.swipes || 0,
        orders: stats.orders || 0,
        sales: Math.round(salesSAR * 100) / 100,
        cpa,
        roas,
      };
    });

    // ترتيب حسب الصرف
    campaignsWithStats.sort((a, b) => (b.spend || 0) - (a.spend || 0));

    // ========== الخطوة 4: حساب Summary ==========
    const summary = campaignsWithStats.reduce(
      (acc, c) => ({
        spend: acc.spend + (c.spend || 0),
        orders: acc.orders + (c.orders || 0),
        sales: acc.sales + (c.sales || 0),
      }),
      { spend: 0, orders: 0, sales: 0 }
    );

    // استخدام account-level spend إذا توفر (أدق من جمع الحملات)
    // orders/sales تأتي دائماً من campaign breakdown
    if (accountSpend !== null) {
      summary.spend = Math.round(accountSpend * conversionRate * 100) / 100;
    } else {
      summary.spend = Math.round(summary.spend * 100) / 100;
    }
    summary.orders = Math.round(summary.orders);
    summary.sales  = Math.round(summary.sales * 100) / 100;

    const summaryRoas =
      summary.spend > 0 ? Math.round((summary.sales / summary.spend) * 100) / 100 : 0;

    // حساب effective_end
    let effectiveEnd = normalizedEnd;
    if (finalizedDataEndTime) {
      const finalizedDate = new Date(finalizedDataEndTime);
      const requestedEnd = new Date(normalizedEnd);
      if (finalizedDate < requestedEnd) {
        effectiveEnd = finalizedDataEndTime;
      }
    }

    const responseTime = Date.now() - startTime;

    // بناء الاستجابة
    const response: any = {
      success: true,
      currency: displayCurrency, // دائماً SAR
      original_currency: accountCurrency, // العملة الأصلية من الحساب
      conversion_rate: conversionRate, // معامل التحويل المستخدم
      time: {
        start: normalizedStart,
        end: normalizedEnd,
        effective_end: effectiveEnd,
        finalized_end: finalizedDataEndTime,
      },
      summary: {
        spend: summary.spend,
        orders: summary.orders,
        sales: summary.sales,
        roas: summaryRoas,
      },
      campaigns: campaignsWithStats,
      response_time_ms: responseTime,
    };

    // Debug info — دائماً نُرجع معلومات التشخيص
    response.debug = {
      ad_account_id: adAccountId,
      account_currency: accountCurrency,
      conversion_rate: conversionRate,
      date_range: { start: normalizedStart, end: normalizedEnd },
      account_spend_usd: accountSpend,
      campaign_stats_map_count: Object.keys(campaignStatsMap).length,
      stats_url: statsUrl,
      stats_http_status: statsResponse.status,
      stats_raw: typeof statsRawDebug === 'object'
        ? { request_status: statsRawDebug?.request_status, error: statsRawDebug?.debug_message, total_stats_count: statsRawDebug?.total_stats?.length }
        : String(statsRawDebug).slice(0, 300),
    };

    // تحذير إذا البيانات غير مكتملة
    if (finalizedDataEndTime && new Date(finalizedDataEndTime) < new Date(normalizedEnd)) {
      response.warning = `Data finalized until ${finalizedDataEndTime}. Recent hours may be incomplete.`;
    }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
