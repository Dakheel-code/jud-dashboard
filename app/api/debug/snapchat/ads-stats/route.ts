/**
 * Debug: Fetch Snapchat Ads-Level Stats
 * GET /api/debug/snapchat/ads-stats?storeId=...&adAccountId=...&startDate=...&endDate=...
 * 
 * يجلب أول 50 Ad IDs ثم يطلب stats على مستوى AD
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/integrations/token-manager';
import { buildSnapchatUrl, validateAdAccountId } from '@/lib/debug/snapchat-url-builder';

export const dynamic = 'force-dynamic';

const SNAPCHAT_API_URL = 'https://adsapi.snapchat.com/v1';

/**
 * تطبيع إلى بداية اليوم (00:00:00.000Z)
 */
function normalizeToStartOfDay(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`;
}

/**
 * تطبيع end_time إلى بداية اليوم التالي
 */
function normalizeEndToNextDay(dateStr: string): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 1);
  return `${date.toISOString().split('T')[0]}T00:00:00.000Z`;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const adAccountId = searchParams.get('adAccountId') || '';
    
    // تواريخ افتراضية: آخر 30 يوم
    const now = new Date();
    const defaultEnd = now.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const defaultStart = thirtyDaysAgo.toISOString().split('T')[0];
    
    const startDate = searchParams.get('startDate') || defaultStart;
    const endDate = searchParams.get('endDate') || defaultEnd;
    
    // تطبيع الأوقات
    const normalizedStartTime = normalizeToStartOfDay(startDate);
    const normalizedEndTime = normalizeEndToNextDay(endDate);
    const daysDiff = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));

    if (!storeId) {
      return NextResponse.json({
        success: false,
        error: 'storeId is required',
        request_status: 'INVALID_REQUEST',
      }, { status: 400 });
    }

    if (!adAccountId) {
      return NextResponse.json({
        success: false,
        error: 'adAccountId is required',
        request_status: 'INVALID_REQUEST',
      }, { status: 400 });
    }

    // التحقق من صحة Ad Account ID
    const idValidation = validateAdAccountId(adAccountId);
    if (!idValidation.valid) {
      return NextResponse.json({
        success: false,
        error: idValidation.error,
        request_status: 'INVALID_AD_ACCOUNT_ID',
      }, { status: 400 });
    }

    // جلب توكن صالح
    const accessToken = await getValidAccessToken(storeId, 'snapchat');
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Not connected or token expired',
        request_status: 'TOKEN_ERROR',
      }, { status: 401 });
    }

    const headers = { Authorization: `Bearer ${accessToken}` };

    // الخطوة 1: جلب أول 50 Ad IDs
    const adsUrl = `${SNAPCHAT_API_URL}/adaccounts/${encodeURIComponent(adAccountId)}/ads?limit=50`;
    console.log('Debug: Fetching ads:', adsUrl);
    
    const adsResponse = await fetch(adsUrl, { headers });
    const adsData = await adsResponse.json();
    
    if (!adsResponse.ok) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch ads',
        request_status: 'ADS_FETCH_ERROR',
        http_status: adsResponse.status,
        ads_error: adsData,
      }, { status: adsResponse.status });
    }

    // استخراج Ad IDs
    const ads = adsData.ads || [];
    const adIds: string[] = [];
    const adDetails: any[] = [];
    
    ads.forEach((item: any) => {
      const ad = item.ad;
      if (ad && ad.id) {
        adIds.push(ad.id);
        adDetails.push({
          id: ad.id,
          name: ad.name || 'Unknown',
          status: ad.status,
          type: ad.type,
        });
      }
    });

    if (adIds.length === 0) {
      return NextResponse.json({
        success: true,
        request_status: 'NO_ADS',
        http_status: 200,
        response_time_ms: Date.now() - startTime,
        ads_count: 0,
        diagnosis: ['⚠️ No ads found in this ad account.', '💡 Create ads first to see stats.'],
        proof: {
          stats_level_used: 'AD',
          fields_used: 'N/A',
          start_time_final: normalizedStartTime,
          end_time_final: normalizedEndTime,
          date_range_days: daysDiff,
        },
      });
    }

    // الخطوة 2: جلب stats لكل ad (batch request)
    // Snapchat يدعم stats على مستوى ads عبر endpoint خاص
    const fields = 'impressions,swipes,spend,video_views';
    
    // نستخدم stats endpoint مع entity_ids
    const statsUrl = buildSnapchatUrl(`adaccounts/${encodeURIComponent(adAccountId)}/stats`, {
      granularity: 'TOTAL',
      fields,
      start_time: normalizedStartTime,
      end_time: normalizedEndTime,
      breakdown: 'ad',
    });

    console.log('Debug: Fetching ads stats:', statsUrl.final_url);
    
    const statsResponse = await fetch(statsUrl.final_url, { headers });
    const statsData = await statsResponse.json();
    const statsHttpStatus = statsResponse.status;

    // معالجة الإحصائيات
    let totalStats = {
      impressions: 0,
      clicks: 0,
      spend: 0,
      video_views: 0,
    };
    
    const adStatsMap: Record<string, any> = {};
    
    if (statsResponse.ok && statsData.timeseries_stats) {
      statsData.timeseries_stats.forEach((item: any) => {
        const stats = item.timeseries_stat?.timeseries?.[0]?.stats || {};
        const adId = item.timeseries_stat?.id;
        
        const impressions = stats.impressions || 0;
        const swipes = stats.swipes || 0;
        const spend = (stats.spend || 0) / 1000000;
        const videoViews = stats.video_views || 0;
        
        totalStats.impressions += impressions;
        totalStats.clicks += swipes;
        totalStats.spend += spend;
        totalStats.video_views += videoViews;
        
        if (adId) {
          adStatsMap[adId] = { impressions, clicks: swipes, spend, video_views: videoViews };
        }
      });
    }

    // دمج Ad details مع stats
    const adsWithStats = adDetails.map(ad => ({
      ...ad,
      stats: adStatsMap[ad.id] || { impressions: 0, clicks: 0, spend: 0, video_views: 0 },
    }));

    // ترتيب حسب spend (Top 10)
    const topAds = [...adsWithStats]
      .sort((a, b) => (b.stats.spend || 0) - (a.stats.spend || 0))
      .slice(0, 10);

    // التشخيص
    const diagnosis: string[] = [];
    
    if (totalStats.spend > 0) {
      diagnosis.push(`✅ Total Spend: ${totalStats.spend.toFixed(2)} (${daysDiff} days)`);
    }
    if (totalStats.impressions > 0) {
      diagnosis.push(`📊 Total Impressions: ${totalStats.impressions.toLocaleString()}`);
    }
    if (totalStats.clicks > 0) {
      diagnosis.push(`👆 Total Clicks: ${totalStats.clicks.toLocaleString()}`);
    }
    if (totalStats.spend === 0 && totalStats.impressions === 0) {
      diagnosis.push('⚠️ No delivery data in this date range.');
      diagnosis.push('💡 Try extending to 30 or 90 days.');
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      request_status: 'SUCCESS',
      http_status: statsHttpStatus,
      response_time_ms: responseTime,
      
      // Proof
      proof: {
        stats_level_used: 'AD',
        fields_used: fields,
        start_time_final: normalizedStartTime,
        end_time_final: normalizedEndTime,
        date_range_days: daysDiff,
        ads_fetched: adIds.length,
      },
      
      // الإحصائيات الإجمالية
      total_stats: totalStats,
      
      // عدد الإعلانات
      ads_count: adIds.length,
      
      // Top 10 Ads
      top_ads: topAds,
      
      // التشخيص
      diagnosis: diagnosis.length > 0 ? diagnosis : ['✅ Stats retrieved successfully!'],
      
      // الرد الكامل
      full_response: statsData,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      request_status: 'EXCEPTION',
      diagnosis: ['An unexpected error occurred. Check server logs.'],
    }, { status: 500 });
  }
}
