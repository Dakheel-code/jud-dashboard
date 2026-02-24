import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

// GET: جلب حالة الاتصال
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('store_id');

  if (!storeId) {
    return NextResponse.json({ error: 'store_id مطلوب' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    // قراءة من الجدولين للتوافق مع النظامين القديم والجديد
    const [tikRes, adRes] = await Promise.all([
      supabase
        .from('tiktok_connections')
        .select('advertiser_id, advertiser_name, connected_at')
        .eq('store_id', storeId)
        .eq('is_active', true),
      supabase
        .from('ad_platform_accounts')
        .select('ad_account_id, ad_account_name, last_connected_at, status')
        .eq('store_id', storeId)
        .eq('platform', 'tiktok')
        .single(),
    ]);

    const tikConnections = tikRes.data ?? [];
    const adPlatform = adRes.data;

    const connectedViaNew = !!adPlatform?.ad_account_id && adPlatform?.status === 'connected';
    const connectedViaOld = tikConnections.length > 0;

    return NextResponse.json({
      connected: connectedViaNew || connectedViaOld,
      connections: tikConnections,
      ad_account_id: adPlatform?.ad_account_id || null,
      ad_account_name: adPlatform?.ad_account_name || null,
    });
  } catch (error: any) {
    console.error('[TikTok Status GET] خطأ:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: فصل الاتصال
export async function DELETE(req: NextRequest) {
  const storeId      = req.nextUrl.searchParams.get('store_id');
  const advertiserId = req.nextUrl.searchParams.get('advertiser_id');

  if (!storeId) {
    return NextResponse.json({ error: 'store_id مطلوب' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();
    let query = supabase
      .from('tiktok_connections')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('store_id', storeId);

    if (advertiserId) {
      query = query.eq('advertiser_id', advertiserId);
    }

    const { error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[TikTok Status DELETE] خطأ:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
