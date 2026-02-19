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

/**
 * تطبيع إلى بداية اليوم UTC
 */
function normalizeToStartOfDay(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * تطبيع إلى بداية الساعة الحالية UTC
 */
function normalizeToStartOfHour(date: Date): string {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

/**
 * حساب تاريخ البداية والنهاية حسب الفترة
 * الفترات 7d/30d/90d تستثني اليوم الحالي (من أمس للخلف)
 * today = اليوم الحالي فقط
 * yesterday = أمس فقط
 */
function getDateRange(range: string): { start: Date; end: Date } {
  const now = new Date();
  
  if (range === 'today') {
    // اليوم: من بداية اليوم إلى الآن
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    return { start, end: now };
  }
  
  if (range === 'yesterday') {
    // أمس: من بداية أمس إلى نهاية أمس
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCHours(23, 59, 59, 999);
    return { start, end };
  }
  
  // باقي الفترات: تستثني اليوم الحالي
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  
  // النهاية = نهاية أمس (23:59:59)
  const end = new Date(now);
  end.setDate(end.getDate() - 1);
  end.setUTCHours(23, 59, 59, 999);
  
  // البداية = قبل X أيام من أمس
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  start.setUTCHours(0, 0, 0, 0);
  
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
    const normalizedStart = normalizeToStartOfDay(startDate);
    const normalizedEnd = normalizeToStartOfHour(endDate);

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

    const statsUrl = `${SNAPCHAT_API_URL}/adaccounts/${encodeURIComponent(
      adAccountId
    )}/stats?granularity=TOTAL&fields=${encodeURIComponent(
      fields
    )}&start_time=${encodeURIComponent(
      normalizedStart
    )}&end_time=${encodeURIComponent(normalizedEnd)}&breakdown=campaign`;

    const statsResponse = await fetch(statsUrl, { headers });
    const statsData = await statsResponse.json().catch(() => ({}));

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

    // ========== Fallback: جلب stats على مستوى الحساب إذا لم يُرجع breakdown بيانات ==========
    let accountLevelStats: { spend: number; orders: number; sales: number } | null = null;
    if (Object.keys(campaignStatsMap).length === 0) {
      const accStatsUrl = `${SNAPCHAT_API_URL}/adaccounts/${encodeURIComponent(adAccountId)}/stats?granularity=TOTAL&fields=${encodeURIComponent('spend,conversion_purchases,conversion_purchases_value')}&start_time=${encodeURIComponent(normalizedStart)}&end_time=${encodeURIComponent(normalizedEnd)}`;
      try {
        const accRes = await fetch(accStatsUrl, { headers });
        if (accRes.ok) {
          const accData = await accRes.json();
          // محاولة استخراج من total_stats أو timeseries_stats
          const s = accData?.total_stats?.[0]?.total_stat?.stats
                 || accData?.total_stats?.[0]?.stats
                 || accData?.timeseries_stats?.[0]?.timeseries_stat?.timeseries?.[0]?.stats
                 || null;
          if (s) {
            accountLevelStats = {
              spend:  (s.spend || 0) / 1_000_000,
              orders: s.conversion_purchases || 0,
              sales:  (s.conversion_purchases_value || 0) / 1_000_000,
            };
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

    // إذا لم تُرجع campaign-level stats أي بيانات، استخدم account-level stats
    if (summary.spend === 0 && accountLevelStats) {
      summary.spend  = Math.round(accountLevelStats.spend  * conversionRate * 100) / 100;
      summary.orders = accountLevelStats.orders;
      summary.sales  = Math.round(accountLevelStats.sales  * conversionRate * 100) / 100;
    } else {
      summary.spend = Math.round(summary.spend * 100) / 100;
      summary.sales = Math.round(summary.sales * 100) / 100;
    }

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

    // Debug info
    if (debug) {
      response.debug = {
        ad_account_id: adAccountId,
        fields_used: fields,
        campaigns_count: campaignsList.length,
        stats_rows: Object.keys(campaignStatsMap).length,
        stats_url: statsUrl,
        raw_stats: statsData,
        sample_mapped_campaign_ids: Object.keys(campaignStatsMap).slice(0, 10),
        currency_conversion: {
          from: accountCurrency,
          to: displayCurrency,
          rate: conversionRate,
        },
      };
    }

    // تحذير إذا البيانات غير مكتملة
    if (finalizedDataEndTime && new Date(finalizedDataEndTime) < new Date(normalizedEnd)) {
      response.warning = `Data finalized until ${finalizedDataEndTime}. Recent hours may be incomplete.`;
    }

    return NextResponse.json(response);
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
