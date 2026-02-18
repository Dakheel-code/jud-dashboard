/**
 * POST /api/integrations/snapchat/attach
 *
 * يربط متجراً بحساب Snapchat سابق (بدون OAuth جديد)
 * Body: { storeId: string, identityKey: string }
 *
 * السيرفر يجلب أحدث سجل tokens لهذه الهوية
 * وينسخها للمتجر الجديد
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration missing');
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, identityKey } = body;

    if (!storeId || !identityKey) {
      return NextResponse.json(
        { error: 'storeId and identityKey are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // التحقق من وجود المتجر
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // جلب أحدث سجل tokens لهذه الهوية
    // identityKey قد يكون external_user_id أو organization_id
    const { data: sourceRecords, error: sourceError } = await supabase
      .from('ad_platform_accounts')
      .select('*')
      .eq('platform', 'snapchat')
      .not('refresh_token_enc', 'is', null)
      .or(`external_user_id.eq.${identityKey},organization_id.eq.${identityKey}`)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (sourceError || !sourceRecords || sourceRecords.length === 0) {
      return NextResponse.json(
        { error: 'Identity not found or no valid tokens available' },
        { status: 404 }
      );
    }

    const source = sourceRecords[0];

    // نسخ السجل للمتجر الجديد (upsert)
    const { error: upsertError } = await supabase
      .from('ad_platform_accounts')
      .upsert(
        {
          store_id: storeId,
          platform: 'snapchat',
          status: 'connected',
          external_user_id: source.external_user_id,
          external_display_name: source.external_display_name,
          organization_id: source.organization_id,
          ad_account_id: source.ad_account_id,
          ad_account_name: source.ad_account_name,
          scopes: source.scopes,
          access_token_enc: source.access_token_enc,
          refresh_token_enc: source.refresh_token_enc,
          token_expires_at: source.token_expires_at,
          last_connected_at: new Date().toISOString(),
          error_message: null,
        },
        { onConflict: 'store_id,platform' }
      );

    if (upsertError) {
      return NextResponse.json(
        { error: 'Failed to attach account: ' + upsertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ad_account_id: source.ad_account_id,
      ad_account_name: source.ad_account_name,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
