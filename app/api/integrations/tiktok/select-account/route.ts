/**
 * POST /api/integrations/tiktok/select-account
 * حفظ الحساب الإعلاني المختار للمتجر
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { storeId, ad_account_id, ad_account_name, access_token_enc } = await req.json();

    if (!storeId || !ad_account_id || !ad_account_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // جلب السجل الحالي أولاً
    const { data: existing } = await supabase
      .from('ad_platform_accounts')
      .select('id, access_token_enc')
      .eq('store_id', storeId)
      .eq('platform', 'tiktok')
      .single();

    if (existing) {
      // تحديث السجل الموجود
      const { error } = await supabase
        .from('ad_platform_accounts')
        .update({
          ad_account_id,
          ad_account_name,
          status: 'connected',
          last_connected_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', existing.id);

      if (error) throw new Error(error.message);
    } else {
      // إنشاء سجل جديد — نحتاج التوكن من tiktok_connections
      const { data: conn } = await supabase
        .from('tiktok_connections')
        .select('access_token_enc')
        .eq('store_id', storeId)
        .order('connected_at', { ascending: false })
        .limit(1)
        .single();

      if (!conn?.access_token_enc) {
        return NextResponse.json({ success: false, error: 'Token not found. Please reconnect TikTok.' }, { status: 400 });
      }

      const { error } = await supabase
        .from('ad_platform_accounts')
        .insert({
          store_id: storeId,
          platform: 'tiktok',
          ad_account_id,
          ad_account_name,
          access_token_enc: conn.access_token_enc,
          status: 'connected',
          scopes: [],
          token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          last_connected_at: new Date().toISOString(),
        });

      if (error) throw new Error(error.message);
    }

    // جلب store_url للتوجيه
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
