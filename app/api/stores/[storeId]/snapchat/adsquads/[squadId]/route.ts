/**
 * PUT /api/stores/[storeId]/snapchat/adsquads/[squadId]
 * تحديث حالة أو ميزانية مجموعة إعلانية
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

const SNAP = 'https://adsapi.snapchat.com/v1';

export async function PUT(
  request: NextRequest,
  { params }: { params: { storeId: string; squadId: string } }
) {
  try {
    let { storeId, squadId } = params;
    const body = await request.json();
    const { action, daily_budget_micro } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'DB not configured' }, { status: 503 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // تحويل storeId إلى UUID إذا لزم
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
    if (!isUuid) {
      const { data: row } = await supabase.from('stores').select('id').eq('store_url', storeId).single();
      if (row?.id) storeId = row.id;
    }

    const { data: integration } = await supabase
      .from('ad_platform_accounts')
      .select('*')
      .eq('store_id', storeId)
      .eq('platform', 'snapchat')
      .single();

    if (!integration?.access_token_enc) {
      return NextResponse.json({ success: false, error: 'No connected Snapchat account' }, { status: 400 });
    }

    const accessToken = decrypt(integration.access_token_enc);
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Token expired' }, { status: 401 });
    }

    const h = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // جلب بيانات الـ squad الحالية أولاً (Snapchat يحتاج name في PUT)
    const getRes = await fetch(`${SNAP}/adsquads/${squadId}`, { headers: h });
    if (!getRes.ok) {
      return NextResponse.json({ success: false, error: 'Squad not found' }, { status: 404 });
    }
    const getData = await getRes.json();
    const currentSquad = getData.adsquads?.[0]?.adsquad;
    if (!currentSquad) {
      return NextResponse.json({ success: false, error: 'Squad data not found' }, { status: 404 });
    }

    // بناء الـ update
    const updateData: any = {
      id: squadId,
      name: currentSquad.name,
      campaign_id: currentSquad.campaign_id,
      type: currentSquad.type,
      billing_event: currentSquad.billing_event,
      optimization_goal: currentSquad.optimization_goal,
      placement_v2: currentSquad.placement_v2,
      targeting: currentSquad.targeting,
    };

    if (action === 'pause') updateData.status = 'PAUSED';
    else if (action === 'resume') updateData.status = 'ACTIVE';

    if (daily_budget_micro !== undefined) {
      updateData.daily_budget_micro = daily_budget_micro;
    }

    const putRes = await fetch(`${SNAP}/adsquads/${squadId}`, {
      method: 'PUT',
      headers: h,
      body: JSON.stringify({ adsquads: [updateData] }),
    });

    const putData = await putRes.json();

    if (!putRes.ok) {
      return NextResponse.json({
        success: false,
        error: putData?.request_status || 'Failed to update squad',
        details: putData,
      }, { status: putRes.status });
    }

    const updatedSquad = putData.adsquads?.[0]?.adsquad;
    return NextResponse.json({
      success: true,
      message: action === 'pause' ? 'تم إيقاف المجموعة' : action === 'resume' ? 'تم تشغيل المجموعة' : 'تم تحديث الميزانية',
      squad: updatedSquad,
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
