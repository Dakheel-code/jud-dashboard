/**
 * GET /api/stores/[storeId]/snapchat/adaccounts
 *
 * يجلب قائمة Ad Accounts لمتجر معين باستخدام getValidAccessToken
 * (مع refresh تلقائي إذا قرب التوكن على الانتهاء)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getValidAccessToken } from '@/lib/integrations/token-manager';
import { listAdAccounts } from '@/lib/integrations/snapchat';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration missing');
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    let storeId = params.storeId;

    const supabase = getSupabaseAdmin();

    // إذا لم يكن UUID، نحوّله عبر store_url
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
    if (!isUuid) {
      const { data: storeRow } = await supabase
        .from('stores')
        .select('id')
        .eq('store_url', storeId)
        .single();
      if (storeRow?.id) storeId = storeRow.id;
    }

    // جلب توكن صالح مع refresh تلقائي
    const accessToken = await getValidAccessToken(storeId, 'snapchat');

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not connected or token expired', needsReauth: true },
        { status: 401 }
      );
    }

    // جلب الحسابات الإعلانية من Snapchat API
    const { adAccounts } = await listAdAccounts({ accessToken });

    const formattedAccounts = adAccounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      organization_id: acc.organization_id,
      currency: acc.currency,
      status: acc.status,
    }));

    return NextResponse.json({
      success: true,
      adAccounts: formattedAccounts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch ad accounts: ' + error.message },
      { status: 500 }
    );
  }
}
