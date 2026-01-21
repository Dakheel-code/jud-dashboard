/**
 * Debug: Fetch Snapchat Stats / Reporting
 * GET /api/debug/snapchat/stats?storeId=...&adAccountId=...&startDate=...&endDate=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/integrations/token-manager';

export const dynamic = 'force-dynamic';

const SNAPCHAT_API_URL = 'https://adsapi.snapchat.com/v1';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const adAccountId = searchParams.get('adAccountId');
    const granularity = searchParams.get('granularity') || 'TOTAL';
    
    // تواريخ افتراضية: آخر 7 أيام
    const now = new Date();
    const defaultEnd = now.toISOString().split('T')[0];
    const defaultStart = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
    
    const startDate = searchParams.get('startDate') || defaultStart;
    const endDate = searchParams.get('endDate') || defaultEnd;

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

    // جلب توكن صالح
    const accessToken = await getValidAccessToken(storeId, 'snapchat');
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Not connected or token expired',
        request_status: 'TOKEN_ERROR',
        diagnosis: 'User needs to re-authenticate with Snapchat',
      }, { status: 401 });
    }

    // الحقول المطلوبة
    const fields = 'impressions,swipes,spend,conversion_purchases,conversion_purchases_value,video_views,screen_time_millis';
    
    // جلب الإحصائيات
    const url = `${SNAPCHAT_API_URL}/adaccounts/${adAccountId}/stats?granularity=${granularity}&fields=${fields}&start_time=${startDate}T00:00:00.000-00:00&end_time=${endDate}T23:59:59.999-00:00`;
    console.log('Debug: Fetching stats:', url);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const responseTime = Date.now() - startTime;
    const httpStatus = response.status;
    const responseData = await response.json();

    // استخراج الإحصائيات
    let stats: any = {};
    let timeseriesData: any[] = [];
    
    if (responseData.timeseries_stats) {
      const timeseries = responseData.timeseries_stats[0]?.timeseries || [];
      timeseriesData = timeseries;
      
      // تجميع الإحصائيات
      timeseries.forEach((t: any) => {
        const s = t.stats || {};
        stats.impressions = (stats.impressions || 0) + (s.impressions || 0);
        stats.swipes = (stats.swipes || 0) + (s.swipes || 0);
        stats.spend = (stats.spend || 0) + (s.spend || 0);
        stats.conversion_purchases = (stats.conversion_purchases || 0) + (s.conversion_purchases || 0);
        stats.conversion_purchases_value = (stats.conversion_purchases_value || 0) + (s.conversion_purchases_value || 0);
        stats.video_views = (stats.video_views || 0) + (s.video_views || 0);
      });
    } else if (responseData.total_stats) {
      stats = responseData.total_stats[0]?.stats || {};
    }

    // تحويل القيم
    const processedStats = {
      impressions: stats.impressions || 0,
      clicks: stats.swipes || 0,
      spend: (stats.spend || 0) / 1000000, // تحويل من micro إلى عادي
      spend_raw: stats.spend || 0,
      conversions: stats.conversion_purchases || 0,
      revenue: (stats.conversion_purchases_value || 0) / 1000000,
      revenue_raw: stats.conversion_purchases_value || 0,
      video_views: stats.video_views || 0,
      roas: stats.spend > 0 ? (stats.conversion_purchases_value || 0) / stats.spend : 0,
    };

    // التشخيص التلقائي
    const diagnosis: string[] = [];
    
    if (processedStats.impressions === 0 && processedStats.spend === 0) {
      diagnosis.push('No stats data found for this date range. Either no ads ran or date range is empty.');
    }
    
    if (processedStats.impressions > 0 && processedStats.conversions === 0) {
      diagnosis.push('Impressions exist but no conversions. Pixel may not be configured or no purchases occurred.');
    }

    if (processedStats.spend > 0 && processedStats.revenue === 0) {
      diagnosis.push('Spend exists but no revenue tracked. Check conversion tracking setup.');
    }

    const hasPaging = !!responseData.paging?.next_link;
    if (hasPaging) {
      diagnosis.push('Data is paginated.');
    }

    return NextResponse.json({
      success: response.ok,
      request_status: responseData.request_status || (response.ok ? 'SUCCESS' : 'ERROR'),
      http_status: httpStatus,
      response_time_ms: responseTime,
      
      // معلومات الطلب
      request_info: {
        ad_account_id: adAccountId,
        start_date: startDate,
        end_date: endDate,
        granularity: granularity,
        fields_requested: fields,
      },
      
      // الإحصائيات المعالجة
      stats: processedStats,
      
      // البيانات اليومية (إذا كان granularity = DAY)
      timeseries_count: timeseriesData.length,
      timeseries: timeseriesData.slice(0, 10), // أول 10 فقط للعرض
      
      // Pagination
      has_paging: hasPaging,
      next_link: responseData.paging?.next_link || null,
      
      // التشخيص
      diagnosis: diagnosis.length > 0 ? diagnosis : ['Stats retrieved successfully!'],
      
      // الرد الكامل
      full_response: responseData,
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
