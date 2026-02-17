/**
 * Debug: Fetch Snapchat Campaigns
 * GET /api/debug/snapchat/campaigns?storeId=...&adAccountId=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/integrations/token-manager';
import { buildSnapchatUrl, createDebugInfo, validateAdAccountId } from '@/lib/debug/snapchat-url-builder';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const adAccountId = searchParams.get('adAccountId') || '';
    const nextLink = searchParams.get('nextLink');

    if (!storeId) {
      return NextResponse.json({
        success: false,
        error: 'storeId is required',
        request_status: 'INVALID_REQUEST',
      }, { status: 400 });
    }

    if (!adAccountId && !nextLink) {
      return NextResponse.json({
        success: false,
        error: 'adAccountId is required',
        request_status: 'INVALID_REQUEST',
      }, { status: 400 });
    }

    // التحقق من صحة Ad Account ID (إذا لم يكن nextLink)
    if (!nextLink && adAccountId) {
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

    // بناء URL باستخدام الدالة الموحدة
    const urlResult = nextLink 
      ? { success: true, final_url: nextLink, computed_base_url: '', computed_version: '', computed_path: '', query_string: '' }
      : buildSnapchatUrl(`adaccounts/${encodeURIComponent(adAccountId)}/campaigns`);
    
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
        diagnosis: [`API returned error: HTTP ${httpStatus}`],
        full_response: responseData,
      });
    }

    // تحليل البيانات
    const campaigns = responseData.campaigns || [];
    
    // تصنيف الحملات حسب الحالة
    const statusCounts: Record<string, number> = {};
    campaigns.forEach((c: any) => {
      const status = c.campaign?.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // التشخيص التلقائي
    const diagnosis: string[] = [];
    
    if (campaigns.length === 0 && response.ok) {
      diagnosis.push('No campaigns found in this ad account.');
    }

    const hasPaging = !!responseData.paging?.next_link;
    if (hasPaging) {
      diagnosis.push('Data is paginated. Click "Load Next Page" to see more.');
    }

    if (campaigns.length > 0 && !statusCounts['ACTIVE']) {
      diagnosis.push('No ACTIVE campaigns found. All campaigns may be paused or completed.');
    }

    return NextResponse.json({
      success: true,
      request_status: responseData.request_status || 'SUCCESS',
      http_status: httpStatus,
      response_time_ms: responseTime,
      
      // Debug Info
      debug_info: debugInfo,
      raw_response_body: rawResponseBody.substring(0, 2000), // أول 2000 حرف
      
      // البيانات
      campaigns_count: campaigns.length,
      status_breakdown: statusCounts,
      campaigns: campaigns.map((c: any) => ({
        id: c.campaign?.id,
        name: c.campaign?.name,
        status: c.campaign?.status,
        objective: c.campaign?.objective,
        created_at: c.campaign?.created_at,
        updated_at: c.campaign?.updated_at,
      })),
      
      // Pagination
      has_paging: hasPaging,
      next_link: responseData.paging?.next_link || null,
      
      // التشخيص
      diagnosis: diagnosis.length > 0 ? diagnosis : ['All looks good!'],
      
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
