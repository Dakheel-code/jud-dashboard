/**
 * Integration Status - جلب حالة ربط جميع المنصات للمتجر
 * GET /api/integrations/status?storeId=...
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // تحويل storeId من store_url إلى UUID إذا لزم
    let resolvedId = storeId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
    if (!isUuid) {
      const { data: storeRow } = await supabase
        .from('stores').select('id').eq('store_url', storeId).single();
      if (storeRow?.id) resolvedId = storeRow.id;
    }

    // جلب حالة جميع المنصات للمتجر
    const { data: accounts, error } = await supabase
      .from('ad_platform_accounts')
      .select('platform, status, ad_account_id, ad_account_name, organization_id, last_connected_at, error_message')
      .eq('store_id', resolvedId);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
    }

    // تحويل إلى object بالمنصة كمفتاح
    const platforms: Record<string, any> = {
      snapchat: { status: 'disconnected' },
      tiktok: { status: 'disconnected' },
      meta: { status: 'disconnected' },
      google: { status: 'disconnected' },
    };

    accounts?.forEach((acc) => {
      platforms[acc.platform] = {
        status: acc.status,
        ad_account_id: acc.ad_account_id,
        ad_account_name: acc.ad_account_name,
        organization_id: acc.organization_id,
        last_connected_at: acc.last_connected_at,
        error_message: acc.error_message,
      };
    });

    return NextResponse.json({
      success: true,
      storeUUID: resolvedId,
      platforms,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
