/**
 * GET /api/stores/[storeId]/snapchat/status
 * 
 * يرجع حالة ربط Snapchat للمتجر
 * المصدر الوحيد للحقيقة: جدول ad_platform_accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const storeId = params.storeId;

    const supabase = getSupabaseAdmin();

    // جلب بيانات الربط من جدول ad_platform_accounts (نفس الجدول الذي يستخدمه token-manager)
    const { data: integration, error: integrationError } = await supabase
      .from('ad_platform_accounts')
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
        debug: { error: integrationError?.message, storeId },
      });
    }

    // التحقق من حالة الربط بناءً على DB فقط
    const hasAccessToken = !!integration.access_token_enc;
    const hasRefreshToken = !!integration.refresh_token_enc;
    const hasAdAccount = !!integration.ad_account_id;
    const statusIsConnected = integration.status === 'connected';
    const statusNeedsReauth = integration.status === 'needs_reauth';

    // التحقق من صلاحية التوكن
    let tokenExpired = false;
    if (integration.token_expires_at) {
      const expiresAt = new Date(integration.token_expires_at);
      tokenExpired = expiresAt < new Date();
    }

    // connected = لديه access_token أو refresh_token ولم يكن status=needs_reauth
    // ملاحظة: إذا كان لديه refresh_token، يعتبر connected لأن النظام سيجدد التوكن تلقائياً
    const connected = (hasAccessToken || hasRefreshToken) && !statusNeedsReauth;
    
    // needs_reauth = status=needs_reauth أو (التوكن منتهي وليس لديه refresh token)
    const needsReauth = statusNeedsReauth || (tokenExpired && !hasRefreshToken && !hasAccessToken);

    const response = {
      connected,
      needs_reauth: needsReauth,
      ad_account_selected: hasAdAccount,
      ad_account_name: integration.ad_account_name || null,
      ad_account_id: integration.ad_account_id || null,
      organization_id: integration.organization_id || null,
      status: integration.status,
      debug: {
        storeId,
        hasAccessToken,
        hasRefreshToken,
        hasAdAccount,
        tokenExpired,
        dbStatus: integration.status,
      },
    };

    return NextResponse.json(response);

  } catch (error: any) {
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
