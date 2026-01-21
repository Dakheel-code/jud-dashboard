/**
 * Debug: Fetch Snapchat Organizations + Roles
 * GET /api/debug/snapchat/organizations?storeId=...
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

    if (!storeId) {
      return NextResponse.json({
        success: false,
        error: 'storeId is required',
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

    // جلب Organizations مع Ad Accounts
    const url = `${SNAPCHAT_API_URL}/me/organizations?with_ad_accounts=true`;
    console.log('Debug: Fetching organizations:', url);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const responseTime = Date.now() - startTime;
    const httpStatus = response.status;
    const responseData = await response.json();

    // تحليل البيانات
    const organizations = responseData.organizations || [];
    const allAdAccounts: any[] = [];
    
    organizations.forEach((org: any) => {
      const orgData = org.organization;
      if (orgData?.ad_accounts) {
        orgData.ad_accounts.forEach((acc: any) => {
          allAdAccounts.push({
            ...acc.ad_account,
            organization_id: orgData.id,
            organization_name: orgData.name,
          });
        });
      }
    });

    // التشخيص التلقائي
    const diagnosis: string[] = [];
    
    if (organizations.length === 0) {
      diagnosis.push('No organizations found. User may not have access to any Snapchat Business accounts.');
    }
    
    if (allAdAccounts.length === 0) {
      diagnosis.push('No ad accounts found. User may not have advertising permissions.');
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
      organizations_count: organizations.length,
      ad_accounts_count: allAdAccounts.length,
      organizations: organizations,
      ad_accounts: allAdAccounts,
      
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
