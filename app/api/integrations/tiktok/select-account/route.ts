/**
 * POST /api/integrations/tiktok/select-account
 * حفظ الحساب الإعلاني المختار للمتجر
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateSelectedAdAccount } from '@/lib/integrations/token-manager';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { storeId, ad_account_id, ad_account_name } = await req.json();

    if (!storeId || !ad_account_id || !ad_account_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await updateSelectedAdAccount(storeId, 'tiktok', {
      id: ad_account_id,
      name: ad_account_name,
    });

    // جلب store_url للتوجيه
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: store } = await supabase
      .from('stores')
      .select('store_url')
      .eq('id', storeId)
      .single();

    return NextResponse.json({
      success: true,
      message: 'تم ربط الحساب الإعلاني بنجاح',
      redirect: `/admin/store/${store?.store_url || storeId}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
