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

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const responseTime = Date.now() - startTime;
    const httpStatus = response.status;
    const responseData = await response.json();

    // تحليل البيانات
    const organizations = responseData.organizations || [];
    const allAdAccounts: any[] = [];
    
    // Debug: طباعة هيكل البيانات
    if (organizations.length > 0) {
    }
    
    organizations.forEach((org: any) => {
      const orgData = org.organization;
      
      if (orgData?.ad_accounts) {
        orgData.ad_accounts.forEach((acc: any) => {
          // قد يكون الـ ad_account مباشرة أو داخل wrapper
          const adAccount = acc.ad_account || acc;
          
          if (adAccount && adAccount.id) {
            allAdAccounts.push({
              id: adAccount.id,
              name: adAccount.name || 'Unknown',
              status: adAccount.status,
              type: adAccount.type,
              currency: adAccount.currency,
              timezone: adAccount.timezone,
              organization_id: orgData.id,
              organization_name: orgData.name,
            });
          }
        });
      }
    });
    
    // Debug: طباعة أول ad account للتحقق
    if (allAdAccounts.length > 0) {
    }

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

    // إذا لم نجد ad accounts، نضيف تشخيص إضافي
    if (allAdAccounts.length === 0 && organizations.length > 0) {
      diagnosis.push('Organizations found but no ad_accounts inside. Check full_response for data structure.');
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
      
      // Debug info
      debug_extraction: {
        first_org_keys: organizations.length > 0 ? Object.keys(organizations[0]?.organization || organizations[0] || {}) : [],
        first_org_has_ad_accounts: organizations.length > 0 ? !!(organizations[0]?.organization?.ad_accounts) : false,
      },
      
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
