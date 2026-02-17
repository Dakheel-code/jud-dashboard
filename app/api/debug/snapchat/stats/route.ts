/**
 * Debug: Fetch Snapchat Stats / Reporting
 * GET /api/debug/snapchat/stats?storeId=...&adAccountId=...&startDate=...&endDate=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/integrations/token-manager';
import { buildSnapchatUrl, createDebugInfo, validateAdAccountId } from '@/lib/debug/snapchat-url-builder';

export const dynamic = 'force-dynamic';

/**
 * تطبيع الوقت إلى بداية الساعة (صفر الدقائق/الثواني/المللي)
 */
function normalizeToHour(date: Date): string {
  const normalized = new Date(date);
  normalized.setMinutes(0, 0, 0);
  return normalized.toISOString();
}

/**
 * تطبيع إلى بداية اليوم (00:00:00.000Z)
 */
function normalizeToStartOfDay(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`;
}

/**
 * تطبيع end_time إلى بداية اليوم التالي (لتغطية اليوم كاملاً)
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
    const granularity = searchParams.get('granularity') || 'TOTAL';
    const level = searchParams.get('level') || 'AD_ACCOUNT';
    
    // تواريخ افتراضية: آخر 7 أيام
    const now = new Date();
    const defaultEnd = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const defaultStart = sevenDaysAgo.toISOString().split('T')[0];
    
    const startDate = searchParams.get('startDate') || defaultStart;
    const endDate = searchParams.get('endDate') || defaultEnd;
    
    // تطبيع الأوقات - Snapchat يتطلب أن تكون على رأس الساعة
    const normalizedStartTime = normalizeToStartOfDay(startDate);
    const normalizedEndTime = normalizeEndToNextDay(endDate);
    
    // تحديد الحقول حسب المستوى
    // AD_ACCOUNT يدعم فقط spend
    // باقي المستويات تدعم كل الحقول
    const fieldsForLevel = level === 'AD_ACCOUNT' 
      ? 'spend'
      : 'impressions,swipes,spend,conversion_purchases,conversion_purchases_value,video_views';

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
        error_code: idValidation.error_code,
        ad_account_id_received: adAccountId,
        diagnosis: [`Invalid Ad Account ID: ${idValidation.error}`],
      }, { status: 400 });
    }

    // جلب توكن صالح
    const accessToken = await getValidAccessToken(storeId, 'snapchat');
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Not connected or token expired',
        request_status: 'TOKEN_ERROR',
        diagnosis: ['User needs to re-authenticate with Snapchat'],
      }, { status: 401 });
    }

    // استخدام الحقول المناسبة للمستوى
    const fields = fieldsForLevel;
    
    // بناء URL باستخدام الدالة الموحدة (مع الأوقات المطبّعة)
    const urlResult = buildSnapchatUrl(`adaccounts/${encodeURIComponent(adAccountId)}/stats`, {
      granularity,
      fields,
      start_time: normalizedStartTime,
      end_time: normalizedEndTime,
    });
    
    // التحقق من صحة URL
    if (!urlResult.success) {
      return NextResponse.json({
        success: false,
        error: urlResult.error,
        request_status: 'INVALID_URL_COMPOSITION',
        error_code: urlResult.error_code,
        debug_info: {
          final_url: urlResult.final_url,
          computed_base_url: urlResult.computed_base_url,
          computed_path: urlResult.computed_path,
          ad_account_id_used: adAccountId,
        },
        diagnosis: [`URL validation failed: ${urlResult.error}`],
      }, { status: 400 });
    }

    const url = urlResult.final_url;
    const headers = { Authorization: `Bearer ${accessToken}` };
    

    const response = await fetch(url, { headers });

    const responseTime = Date.now() - startTime;
    const httpStatus = response.status;
    const rawResponseBody = await response.text();
    
    let responseData: any;
    try {
      responseData = JSON.parse(rawResponseBody);
    } catch {
      responseData = { raw_text: rawResponseBody };
    }

    // إنشاء debug info
    const debugInfo = createDebugInfo(urlResult, adAccountId, headers);

    // إذا كان هناك خطأ من API
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        request_status: 'ERROR',
        http_status: httpStatus,
        response_time_ms: responseTime,
        error: responseData.error_message || responseData.message || `HTTP ${httpStatus}`,
        error_code: responseData.error_code || responseData.request_status,
        debug_message: responseData.debug_message || null,
        debug_info: debugInfo,
        raw_response_body: rawResponseBody,
        request_info: {
          ad_account_id: adAccountId,
          level: level,
          start_date: startDate,
          end_date: endDate,
          normalized_start_time: normalizedStartTime,
          normalized_end_time: normalizedEndTime,
          granularity: granularity,
          fields_requested: fields,
          fields_note: level === 'AD_ACCOUNT' ? 'AD_ACCOUNT level only supports spend field' : 'Full fields supported',
        },
        diagnosis: [`API returned error: HTTP ${httpStatus}`],
        full_response: responseData,
      });
    }

    // استخراج الإحصائيات - دعم هياكل مختلفة
    let stats: any = {};
    let timeseriesData: any[] = [];
    let finalizedDataEndTime: string | null = null;
    
    // محاولة استخراج من total_stats أولاً (الأكثر شيوعاً)
    if (responseData.total_stats && responseData.total_stats.length > 0) {
      const totalStat = responseData.total_stats[0]?.total_stat;
      stats = totalStat?.stats || {};
      finalizedDataEndTime = totalStat?.finalized_data_end_time || null;
    }
    // محاولة استخراج من timeseries_stats
    else if (responseData.timeseries_stats) {
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
    }
    
    // تحديد ما إذا كان هناك أي بيانات
    const statsKeys = Object.keys(stats).filter(k => typeof stats[k] === 'number' && stats[k] > 0);
    const hasAnyStats = statsKeys.length > 0;
    const hasSpend = typeof stats.spend === 'number' && stats.spend > 0;

    // تحويل القيم
    const processedStats = {
      impressions: stats.impressions || 0,
      clicks: stats.swipes || 0,
      spend: (stats.spend || 0) / 1000000,
      spend_raw: stats.spend || 0,
      conversions: stats.conversion_purchases || 0,
      revenue: (stats.conversion_purchases_value || 0) / 1000000,
      revenue_raw: stats.conversion_purchases_value || 0,
      video_views: stats.video_views || 0,
      roas: stats.spend > 0 ? (stats.conversion_purchases_value || 0) / stats.spend : 0,
    };

    // التشخيص التلقائي المحسّن
    const diagnosis: string[] = [];
    const daysDiff = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    
    // منطق التشخيص حسب Level
    if (level === 'AD_ACCOUNT') {
      // AD_ACCOUNT level - يدعم spend فقط
      if (hasAnyStats || hasSpend) {
        diagnosis.push(`✅ Account stats found (${daysDiff} days)`);
        if (hasSpend) {
          diagnosis.push(`💰 Spend: ${processedStats.spend.toFixed(2)}`);
        }
        diagnosis.push('ℹ️ AD_ACCOUNT level supports spend only.');
        diagnosis.push('💡 For impressions/swipes/clicks, use AD or CAMPAIGN reporting.');
      } else {
        diagnosis.push('⚠️ No delivery in selected range.');
        if (daysDiff <= 7) {
          diagnosis.push('📅 Try extending to 30 or 90 days.');
        }
      }
    } else {
      // AD, CAMPAIGN, AD_SQUAD levels - يدعم كل الحقول
      if (hasAnyStats) {
        diagnosis.push(`✅ Stats found (${daysDiff} days)`);
        if (processedStats.spend > 0) {
          diagnosis.push(`💰 Spend: ${processedStats.spend.toFixed(2)}`);
        }
        if (processedStats.impressions > 0) {
          diagnosis.push(`📊 Impressions: ${processedStats.impressions.toLocaleString()}`);
        }
        if (processedStats.clicks > 0) {
          diagnosis.push(`👆 Clicks: ${processedStats.clicks.toLocaleString()}`);
        }
      } else {
        diagnosis.push('⚠️ No delivery in selected range.');
        diagnosis.push('💡 Possible reasons:');
        diagnosis.push('   1. Ads may be paused or not running');
        diagnosis.push('   2. No impressions delivered in this period');
        if (daysDiff <= 7) {
          diagnosis.push('📅 Try extending to 30 or 90 days.');
        }
      }
      
      // تحذير إذا فيه impressions بس ما فيه conversions
      if (processedStats.impressions > 0 && processedStats.conversions === 0) {
        diagnosis.push('📊 Impressions exist but no conversions.');
        diagnosis.push('💡 Conversions need Pixel/CAPI setup.');
      }
    }

    // تحذير إذا end_time أكبر من finalized_data_end_time
    if (finalizedDataEndTime) {
      const finalizedDate = new Date(finalizedDataEndTime);
      const requestedEndDate = new Date(normalizedEndTime);
      if (requestedEndDate > finalizedDate) {
        diagnosis.push(`⏰ Data finalized only until ${finalizedDataEndTime}. Newer hours may be incomplete.`);
      }
    }

    const hasPaging = !!responseData.paging?.next_link;
    if (hasPaging) {
      diagnosis.push('📄 Data is paginated.');
    }

    return NextResponse.json({
      success: true,
      request_status: responseData.request_status || 'SUCCESS',
      http_status: httpStatus,
      response_time_ms: responseTime,
      
      // Debug Info
      debug_info: debugInfo,
      raw_response_body: rawResponseBody.substring(0, 2000),
      
      // Proof - معلومات التحقق
      proof: {
        stats_level_used: level,
        fields_used: fields,
        stats_keys: statsKeys,
        has_any_stats: hasAnyStats,
        has_spend: hasSpend,
        start_time_final: normalizedStartTime,
        end_time_final: normalizedEndTime,
        finalized_data_end_time: finalizedDataEndTime,
        date_range_days: daysDiff,
      },
      
      // معلومات الطلب
      request_info: {
        ad_account_id: adAccountId,
        level: level,
        start_date: startDate,
        end_date: endDate,
        normalized_start_time: normalizedStartTime,
        normalized_end_time: normalizedEndTime,
        granularity: granularity,
        fields_requested: fields,
        fields_note: level === 'AD_ACCOUNT' ? 'AD_ACCOUNT level only supports spend field' : 'Full fields supported',
      },
      
      // الإحصائيات المعالجة
      stats: processedStats,
      
      // البيانات اليومية
      timeseries_count: timeseriesData.length,
      timeseries: timeseriesData.slice(0, 10),
      
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
