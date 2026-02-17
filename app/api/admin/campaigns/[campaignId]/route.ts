/**
 * API للتحكم في حملات Snapchat
 * PUT - تحديث حالة الحملة (إيقاف/استئناف) أو الميزانية
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/integrations/token-manager';
import { createClient } from '@supabase/supabase-js';

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


    // جلب توكن صالح
    const accessToken = await getValidAccessToken(storeId, 'snapchat');
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
