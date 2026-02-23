import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { searchParams } = new URL(req.url);
    const store_id = searchParams.get('store_id');

    if (!store_id) {
      return NextResponse.json({ error: 'store_id مطلوب' }, { status: 400 });
    }

    // تحويل store_url إلى UUID إذا لزم
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(store_id);
    let resolvedId = store_id;
    if (!isUuid) {
      const { data: storeRow } = await supabase.from('stores').select('id').eq('store_url', store_id).single();
      if (storeRow?.id) resolvedId = storeRow.id;
    }

    const { data, error } = await supabase
      .from('google_ads_connections')
      .select('store_id, customer_id, customer_name, connected_at')
      .eq('store_id', resolvedId)
      .eq('is_active', true);

    if (error) {
      console.error('Google Ads status GET error:', error);
      return NextResponse.json({ error: 'خطأ في جلب الحالة' }, { status: 500 });
    }

    return NextResponse.json({
      connected: (data?.length ?? 0) > 0,
      connections: data ?? [],
    });
  } catch (e: any) {
    console.error('Google Ads status error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { searchParams } = new URL(req.url);
    const store_id = searchParams.get('store_id');
    const customer_id = searchParams.get('customer_id');

    if (!store_id) {
      return NextResponse.json({ error: 'store_id مطلوب' }, { status: 400 });
    }

    let query = supabase
      .from('google_ads_connections')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('store_id', store_id);

    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    const { error } = await query;

    if (error) {
      console.error('Google Ads status DELETE error:', error);
      return NextResponse.json({ error: 'فشل في فصل الربط' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('Google Ads disconnect error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
