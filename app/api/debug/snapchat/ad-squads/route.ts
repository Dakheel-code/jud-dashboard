/**
 * Debug: Fetch Snapchat Ad Squads
 * GET /api/debug/snapchat/ad-squads?storeId=...&adAccountId=...
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

    // جلب Ad Squads
    const url = nextLink || `${SNAPCHAT_API_URL}/adaccounts/${adAccountId}/adsquads`;
    console.log('Debug: Fetching ad squads:', url);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const responseTime = Date.now() - startTime;
    const httpStatus = response.status;
    const responseData = await response.json();

    // تحليل البيانات
    const adSquads = responseData.adsquads || [];
    
    // تصنيف حسب الحالة
    const statusCounts: Record<string, number> = {};
    adSquads.forEach((s: any) => {
      const status = s.adsquad?.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // التشخيص التلقائي
    const diagnosis: string[] = [];
    
    if (adSquads.length === 0) {
      diagnosis.push('No ad squads found. Campaigns may not have any ad sets configured.');
    }

    const hasPaging = !!responseData.paging?.next_link;
    if (hasPaging) {
      diagnosis.push('Data is paginated. You are only seeing first page.');
    }

    return NextResponse.json({
      success: response.ok,
      request_status: responseData.request_status || (response.ok ? 'SUCCESS' : 'ERROR'),
      http_status: httpStatus,
      response_time_ms: responseTime,
      
      // البيانات
      ad_squads_count: adSquads.length,
      status_breakdown: statusCounts,
      ad_squads: adSquads.map((s: any) => ({
        id: s.adsquad?.id,
        name: s.adsquad?.name,
        status: s.adsquad?.status,
        campaign_id: s.adsquad?.campaign_id,
        billing_event: s.adsquad?.billing_event,
        optimization_goal: s.adsquad?.optimization_goal,
        created_at: s.adsquad?.created_at,
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
