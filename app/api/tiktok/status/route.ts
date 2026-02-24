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
    const { data, error } = await supabase
      .from('tiktok_connections')
      .select('advertiser_id, advertiser_name, connected_at')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (error) throw error;

    return NextResponse.json({
      connected: (data?.length ?? 0) > 0,
      connections: data ?? [],
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
