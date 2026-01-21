/**
 * GET /api/stores/[storeId]/snapchat/status
 * 
 * يرجع حالة ربط Snapchat للمتجر
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const storeId = params.storeId;
    console.log('=== Snapchat Status Route Hit ===', { storeId });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        connected: false,
        needs_reauth: false,
        ad_account_selected: false,
        ad_account_name: null,
        ad_account_id: null,
        error: 'Database not configured',
      });
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
      // لا يوجد ربط
      return NextResponse.json({
        connected: false,
        needs_reauth: false,
        ad_account_selected: false,
        ad_account_name: null,
        ad_account_id: null,
        organization_id: null,
      });
    }

    // التحقق من حالة الربط
    const hasAccessToken = !!integration.access_token;
    const hasAdAccount = !!integration.ad_account_id;
    const needsReauth = integration.status === 'needs_reauth' || !hasAccessToken;

    // التحقق من صلاحية التوكن (إذا انتهى)
    let tokenExpired = false;
    if (integration.expires_at) {
      const expiresAt = new Date(integration.expires_at);
      tokenExpired = expiresAt < new Date();
    }

    return NextResponse.json({
      connected: hasAccessToken && !tokenExpired,
      needs_reauth: needsReauth || tokenExpired,
      ad_account_selected: hasAdAccount,
      ad_account_name: integration.ad_account_name || null,
      ad_account_id: integration.ad_account_id || null,
      organization_id: integration.organization_id || null,
      status: integration.status,
    });

  } catch (error: any) {
    console.error('Snapchat status error:', error);
    return NextResponse.json({
      connected: false,
      needs_reauth: false,
      ad_account_selected: false,
      ad_account_name: null,
      ad_account_id: null,
      error: error.message,
    });
  }
}
