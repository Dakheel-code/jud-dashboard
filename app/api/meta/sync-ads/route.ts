/**
 * POST /api/meta/sync-ads?storeId=...
 * يجلب الإعلانات من Meta ويحفظها في meta_ads_cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchAds } from '@/lib/meta/client';
import { decryptToken } from '@/lib/meta/encryption';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');
  if (!storeId) {
    return NextResponse.json({ error: 'storeId مطلوب' }, { status: 400 });
  }

  const supabase = getSupabase();

  // جلب بيانات الاتصال
  const { data: conn, error: connErr } = await supabase
    .from('store_meta_connections')
    .select('access_token_encrypted, ad_account_id, status')
    .eq('store_id', storeId)
    .eq('status', 'active')
    .single();

  if (connErr || !conn) {
    return NextResponse.json({ error: 'لا يوجد ربط نشط لهذا المتجر' }, { status: 404 });
  }

  if (!conn.ad_account_id) {
    return NextResponse.json({ error: 'لم يتم اختيار حساب إعلاني بعد' }, { status: 400 });
  }

  try {
    const token = decryptToken(conn.access_token_encrypted);
    const ads   = await fetchAds(conn.ad_account_id, token);

    if (ads.length === 0) {
      return NextResponse.json({ synced: 0, message: 'لا توجد إعلانات' });
    }

    // تحضير البيانات للـ upsert
    const rows = ads.map((ad: any) => ({
      store_id:             storeId,
      ad_account_id:        conn.ad_account_id,
      ad_id:                ad.id,
      ad_name:              ad.name || null,
      campaign_id:          ad.campaign?.id || null,
      campaign_name:        ad.campaign?.name || null,
      adset_id:             ad.adset?.id || null,
      adset_name:           ad.adset?.name || null,
      status:               ad.status || null,
      effective_status:     ad.effective_status || null,
      creative_preview_url: ad.creative?.thumbnail_url || null,
      updated_at:           new Date().toISOString(),
    }));

    // upsert بناءً على (ad_account_id, ad_id)
    const { error: upsertErr } = await supabase
      .from('meta_ads_cache')
      .upsert(rows, { onConflict: 'ad_account_id,ad_id' });

    if (upsertErr) throw new Error(upsertErr.message);

    // تحديث last_sync_at
    await supabase
      .from('store_meta_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('store_id', storeId);

    return NextResponse.json({ synced: rows.length });
  } catch (err: any) {
    console.error('Meta sync-ads error:', err.message);

    // إذا كان التوكن منتهياً — حدّث الحالة
    if (err.message?.includes('OAuthException') || err.message?.includes('token')) {
      await supabase
        .from('store_meta_connections')
        .update({ status: 'error' })
        .eq('store_id', storeId);
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
