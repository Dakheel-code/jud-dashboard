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

    // تحويل storeId من store_url إلى UUID إذا لزم
    let resolvedStoreId = storeId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
    if (!isUuid) {
      const { data: storeRow } = await supabase
        .from('stores').select('id').eq('store_url', storeId).single();
      if (!storeRow?.id) {
        return NextResponse.json({ success: false, error: `Store not found for: ${storeId}` }, { status: 404 });
      }
      resolvedStoreId = storeRow.id;
    }

    // جلب السجل الحالي أولاً
    const { data: existing } = await supabase
      .from('ad_platform_accounts')
      .select('id, access_token_enc')
      .eq('store_id', resolvedStoreId)
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
        .select('access_token, advertiser_id')
        .eq('store_id', resolvedStoreId)
        .eq('advertiser_id', ad_account_id)
        .single();

      // إذا لم يجد بـ advertiser_id المختار، جرّب أي سجل نشط
      const { data: connFallback } = !conn ? await supabase
        .from('tiktok_connections')
        .select('access_token')
        .eq('store_id', resolvedStoreId)
        .eq('is_active', true)
        .order('connected_at', { ascending: false })
        .limit(1)
        .single() : { data: null };

      const tokenValue = conn?.access_token || connFallback?.access_token;

      if (!tokenValue) {
        return NextResponse.json({
          success: false,
          error: 'Token not found. Please reconnect TikTok.',
          debug: { resolvedStoreId, originalStoreId: storeId }
        }, { status: 400 });
      }

      // تشفير التوكن للحفظ في ad_platform_accounts
      const { encrypt } = await import('@/lib/encryption');
      const { error } = await supabase
        .from('ad_platform_accounts')
        .insert({
          store_id: resolvedStoreId,
          platform: 'tiktok',
          ad_account_id,
          ad_account_name,
          access_token_enc: encrypt(tokenValue),
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
      .eq('id', resolvedStoreId)
      .single();

    return NextResponse.json({
      success: true,
      message: 'تم ربط الحساب الإعلاني بنجاح',
      redirect: `/admin/store/${store?.store_url || storeId}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, stack: err.stack?.slice(0, 300) }, { status: 500 });
  }
}
