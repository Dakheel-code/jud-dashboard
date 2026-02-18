/**
 * Snapchat Select Ad Account - حفظ الحساب الإعلاني المختار
 * POST /api/integrations/snapchat/select-account
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateSelectedAdAccount } from '@/lib/integrations/token-manager';

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
    const { storeId, ad_account_id, ad_account_name, organization_id } = body;

    if (!storeId || !ad_account_id || !ad_account_name) {
      return NextResponse.json(
        { error: 'storeId, ad_account_id, and ad_account_name are required' },
        { status: 400 }
      );
    }

    // تحديث الحساب الإعلاني المختار
    await updateSelectedAdAccount(storeId, 'snapchat', {
      id: ad_account_id,
      name: ad_account_name,
      organizationId: organization_id,
    });

    // جلب store_url للتوجيه الصحيح
    const supabase = getSupabaseAdmin();
    const { data: storeInfo } = await supabase
      .from('stores')
      .select('store_url')
      .eq('id', storeId)
      .single();
    const storeSlug = storeInfo?.store_url || storeId;

    return NextResponse.json({
      success: true,
      message: 'Ad account selected successfully',
      store_url: storeSlug,
      redirect: `/admin/store/${storeSlug}`,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to select ad account' 
      },
      { status: 500 }
    );
  }
}
