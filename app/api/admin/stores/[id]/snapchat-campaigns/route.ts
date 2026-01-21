/**
 * GET /api/admin/stores/[id]/snapchat-campaigns
 * 
 * Endpoint لجلب حملات Snapchat مع الإحصائيات الصحيحة
 * يستخدم Campaign-level reporting بدلاً من AD_ACCOUNT level
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/integrations/token-manager';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SNAPCHAT_API_URL = 'https://adsapi.snapchat.com/v1';

/**
 * تطبيع إلى بداية اليوم (00:00:00.000Z)
 */
function normalizeToStartOfDay(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * تطبيع إلى بداية الساعة الحالية
 */
function normalizeToStartOfHour(date: Date): string {
  const d = new Date(date);
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

/**
 * حساب تاريخ البداية حسب الفترة
 */
function getStartDate(range: string): Date {
  const now = new Date();
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return start;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  
  try {
    const storeId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '30d';
    const debug = searchParams.get('debug') === 'true';

    // التحقق من المتغيرات البيئية
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured',
      }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // جلب بيانات الربط من قاعدة البيانات
    const { data: integration, error: integrationError } = await supabase
      .from('platform_tokens')
      .select('*')
      .eq('store_id', storeId)
      .eq('platform', 'snapchat')
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({
        success: false,
        error: 'Snapchat not connected',
        needs_connection: true,
      }, { status: 404 });
    }

    const adAccountId = integration.ad_account_id;
    if (!adAccountId) {
      return NextResponse.json({
        success: false,
        error: 'No ad account selected',
        needs_account_selection: true,
      }, { status: 400 });
    }

    // جلب توكن صالح (مع refresh تلقائي)
    const accessToken = await getValidAccessToken(storeId, 'snapchat');
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Token expired or invalid',
        needs_reauth: true,
      }, { status: 401 });
    }

    const headers = { Authorization: `Bearer ${accessToken}` };

    // حساب التواريخ
    const now = new Date();
    const startDate = getStartDate(range);
    const normalizedStart = normalizeToStartOfDay(startDate);
    const normalizedEnd = normalizeToStartOfHour(now);

    // ========== الخطوة 1: جلب الحملات ==========
    const campaignsUrl = `${SNAPCHAT_API_URL}/adaccounts/${encodeURIComponent(adAccountId)}/campaigns?limit=100`;
    const campaignsResponse = await fetch(campaignsUrl, { headers });
    
    if (!campaignsResponse.ok) {
      const errorData = await campaignsResponse.json();
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch campaigns',
        http_status: campaignsResponse.status,
        snapchat_error: errorData,
      }, { status: campaignsResponse.status });
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
          objective: campaign.objective,
          daily_budget_micro: campaign.daily_budget_micro,
          start_time: campaign.start_time,
          end_time: campaign.end_time,
        });
      }
    });

    if (campaignsList.length === 0) {
      return NextResponse.json({
        success: true,
        platform: 'snapchat',
        range,
        campaigns: [],
        message: 'No campaigns found in this ad account',
      });
    }

    // ========== الخطوة 2: جلب Stats على مستوى Campaign ==========
    // نستخدم breakdown=campaign للحصول على stats لكل حملة
    const fields = 'spend,impressions,swipes,conversion_purchases,conversion_purchases_value';
    const statsUrl = `${SNAPCHAT_API_URL}/adaccounts/${encodeURIComponent(adAccountId)}/stats?granularity=TOTAL&fields=${fields}&start_time=${encodeURIComponent(normalizedStart)}&end_time=${encodeURIComponent(normalizedEnd)}&breakdown=campaign`;

    console.log('Fetching campaign stats:', statsUrl);

    const statsResponse = await fetch(statsUrl, { headers });
    const statsData = await statsResponse.json();

    // معالجة الإحصائيات
    const campaignStatsMap: Record<string, any> = {};
    let finalizedDataEndTime: string | null = null;

    if (statsResponse.ok) {
      // استخراج من breakdown_stats أو timeseries_stats
      const breakdownStats = statsData.breakdown_stats?.breakdown_stat || [];
      const timeseriesStats = statsData.timeseries_stats || [];

      // محاولة استخراج من breakdown_stats
      if (breakdownStats.length > 0) {
        breakdownStats.forEach((item: any) => {
          const dimension = item.dimension;
          const stats = item.stats || {};
          if (dimension?.campaign_id) {
            campaignStatsMap[dimension.campaign_id] = {
              spend: (stats.spend || 0) / 1000000,
              impressions: stats.impressions || 0,
              swipes: stats.swipes || 0,
              orders: stats.conversion_purchases || 0,
              sales: (stats.conversion_purchases_value || 0) / 1000000,
            };
          }
        });
      }

      // محاولة استخراج من timeseries_stats (fallback)
      if (Object.keys(campaignStatsMap).length === 0 && timeseriesStats.length > 0) {
        timeseriesStats.forEach((item: any) => {
          const timeseriesStat = item.timeseries_stat;
          const campaignId = timeseriesStat?.id;
          const timeseries = timeseriesStat?.timeseries || [];
          
          if (campaignId && timeseries.length > 0) {
            let totalStats = { spend: 0, impressions: 0, swipes: 0, orders: 0, sales: 0 };
            timeseries.forEach((t: any) => {
              const s = t.stats || {};
              totalStats.spend += (s.spend || 0) / 1000000;
              totalStats.impressions += s.impressions || 0;
              totalStats.swipes += s.swipes || 0;
              totalStats.orders += s.conversion_purchases || 0;
              totalStats.sales += (s.conversion_purchases_value || 0) / 1000000;
            });
            campaignStatsMap[campaignId] = totalStats;
          }

          // استخراج finalized_data_end_time
          if (timeseriesStat?.finalized_data_end_time) {
            finalizedDataEndTime = timeseriesStat.finalized_data_end_time;
          }
        });
      }

      // محاولة استخراج من total_stats
      if (Object.keys(campaignStatsMap).length === 0 && statsData.total_stats) {
        statsData.total_stats.forEach((item: any) => {
          const totalStat = item.total_stat;
          const campaignId = totalStat?.id;
          const stats = totalStat?.stats || {};
          
          if (campaignId) {
            campaignStatsMap[campaignId] = {
              spend: (stats.spend || 0) / 1000000,
              impressions: stats.impressions || 0,
              swipes: stats.swipes || 0,
              orders: stats.conversion_purchases || 0,
              sales: (stats.conversion_purchases_value || 0) / 1000000,
            };
          }

          if (totalStat?.finalized_data_end_time) {
            finalizedDataEndTime = totalStat.finalized_data_end_time;
          }
        });
      }
    }

    // ========== الخطوة 3: دمج الحملات مع الإحصائيات ==========
    const campaignsWithStats = campaignsList.map(campaign => {
      const stats = campaignStatsMap[campaign.campaign_id] || {
        spend: 0,
        impressions: 0,
        swipes: 0,
        orders: 0,
        sales: 0,
      };

      // حساب CPA و ROAS
      const cpa = stats.orders > 0 ? stats.spend / stats.orders : 0;
      const roas = stats.spend > 0 ? stats.sales / stats.spend : 0;

      return {
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        status: campaign.status,
        spend: stats.spend,
        impressions: stats.impressions,
        swipes: stats.swipes,
        orders: stats.orders,
        sales: stats.sales,
        cpa: Math.round(cpa * 100) / 100,
        roas: Math.round(roas * 100) / 100,
        has_stats: Object.keys(campaignStatsMap).includes(campaign.campaign_id),
      };
    });

    // ترتيب حسب الصرف (الأعلى أولاً)
    campaignsWithStats.sort((a, b) => b.spend - a.spend);

    // حساب الإجماليات
    const totalsBase = campaignsWithStats.reduce((acc, c) => ({
      spend: acc.spend + c.spend,
      impressions: acc.impressions + c.impressions,
      swipes: acc.swipes + c.swipes,
      orders: acc.orders + c.orders,
      sales: acc.sales + c.sales,
    }), { spend: 0, impressions: 0, swipes: 0, orders: 0, sales: 0 });

    const totals = {
      ...totalsBase,
      cpa: totalsBase.orders > 0 ? Math.round((totalsBase.spend / totalsBase.orders) * 100) / 100 : 0,
      roas: totalsBase.spend > 0 ? Math.round((totalsBase.sales / totalsBase.spend) * 100) / 100 : 0,
    };

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
      platform: 'snapchat',
      range,
      currency: integration.currency || 'SAR',
      time: {
        start: normalizedStart,
        end: normalizedEnd,
        effective_end: effectiveEnd,
        finalized_data_end: finalizedDataEndTime,
      },
      totals,
      campaigns_count: campaignsWithStats.length,
      campaigns: campaignsWithStats,
      response_time_ms: responseTime,
    };

    // إضافة debug info إذا مطلوب
    if (debug) {
      response.debug = {
        ad_account_id: adAccountId,
        fields_used: fields,
        level_used: 'CAMPAIGN (breakdown)',
        stats_url: statsUrl,
        campaigns_with_stats: Object.keys(campaignStatsMap).length,
        raw_stats_response: statsData,
      };
    }

    // تحذير إذا البيانات غير مكتملة
    if (finalizedDataEndTime && new Date(finalizedDataEndTime) < new Date(normalizedEnd)) {
      response.warning = `Data finalized only until ${finalizedDataEndTime}. Recent hours may be incomplete.`;
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Snapchat campaigns error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
    }, { status: 500 });
  }
}
