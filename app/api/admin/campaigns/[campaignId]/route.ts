/**
 * API للتحكم في حملات Snapchat
 * PUT - تحديث حالة الحملة (إيقاف/استئناف) أو الميزانية
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

const SNAPCHAT_API_URL = 'https://adsapi.snapchat.com/v1';

export async function PUT(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  try {
    const { campaignId } = params;
    const body = await request.json();
    const { storeId, action, status, daily_budget_micro } = body;

    if (!storeId) {
      return NextResponse.json({ success: false, error: 'Store ID required' }, { status: 400 });
    }

    if (!campaignId) {
      return NextResponse.json({ success: false, error: 'Campaign ID required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'DB not configured' }, { status: 503 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // تحويل storeId إلى UUID إذا لزم
    let resolvedStoreId = storeId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
    if (!isUuid) {
      const { data: row } = await supabase.from('stores').select('id').eq('store_url', storeId).single();
      if (row?.id) resolvedStoreId = row.id;
    }

    // جلب التوكن مباشرة من قاعدة البيانات
    const { data: integration } = await supabase
      .from('ad_platform_accounts')
      .select('*')
      .eq('store_id', resolvedStoreId)
      .eq('platform', 'snapchat')
      .single();

    if (!integration?.access_token_enc) {
      return NextResponse.json({ success: false, error: 'No connected Snapchat account' }, { status: 400 });
    }

    const accessToken = decrypt(integration.access_token_enc);
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Token expired', needs_reauth: true }, { status: 401 });
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // بناء body التحديث
    const updateBody: any = {};

    if (action === 'pause') {
      updateBody.status = 'PAUSED';
    } else if (action === 'resume') {
      updateBody.status = 'ACTIVE';
    } else if (status) {
      updateBody.status = status;
    }

    if (daily_budget_micro !== undefined) {
      updateBody.daily_budget_micro = daily_budget_micro;
    }

    if (Object.keys(updateBody).length === 0) {
      return NextResponse.json({ success: false, error: 'No update data provided' }, { status: 400 });
    }

    // تحديث الحملة عبر Snapchat API
    const updateUrl = `${SNAPCHAT_API_URL}/campaigns/${campaignId}`;

    const response = await fetch(updateUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        campaigns: [{
          id: campaignId,
          ...updateBody
        }]
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: result.request_status || 'Failed to update campaign',
        details: result
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      message: action === 'pause' ? 'تم إيقاف الحملة' : action === 'resume' ? 'تم استئناف الحملة' : 'تم تحديث الحملة',
      campaign: result.campaigns?.[0]?.campaign
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}
