/**
 * Debug: Fetch Snapchat Campaigns
 * GET /api/debug/snapchat/campaigns?storeId=...&adAccountId=...
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

    // جلب الحملات
    const url = nextLink || `${SNAPCHAT_API_URL}/adaccounts/${adAccountId}/campaigns`;
    console.log('Debug: Fetching campaigns:', url);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const responseTime = Date.now() - startTime;
    const httpStatus = response.status;
    const responseData = await response.json();

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
    
    if (campaigns.length === 0) {
      diagnosis.push('No campaigns found. Either the ad account has no campaigns or user lacks permission.');
    }

    const hasPaging = !!responseData.paging?.next_link;
    if (hasPaging) {
      diagnosis.push('Data is paginated. You are only seeing first page. Click "Load Next Page" to see more.');
    }

    if (campaigns.length > 0 && !statusCounts['ACTIVE']) {
      diagnosis.push('No ACTIVE campaigns found. All campaigns may be paused or completed.');
    }

    return NextResponse.json({
      success: response.ok,
      request_status: responseData.request_status || (response.ok ? 'SUCCESS' : 'ERROR'),
      http_status: httpStatus,
      response_time_ms: responseTime,
      
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
