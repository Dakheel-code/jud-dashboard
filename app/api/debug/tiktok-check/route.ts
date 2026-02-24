import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId');
  if (!storeId) return NextResponse.json({ error: 'storeId مطلوب' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // جلب الربط
  const { data: conn, error: connErr } = await supabase
    .from('tiktok_connections')
    .select('advertiser_id, advertiser_name, is_active')
    .eq('store_id', storeId)
    .limit(5);

  if (connErr || !conn?.length) {
    return NextResponse.json({ error: 'لا يوجد ربط', connErr });
  }

  // جلب التوكن للاتصال النشط
  const { data: activeConn } = await supabase
    .from('tiktok_connections')
    .select('advertiser_id, access_token')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!activeConn) {
    return NextResponse.json({ connections: conn, error: 'لا يوجد ربط نشط' });
  }

  // اختبار TikTok API مباشرة - آخر 7 أيام
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const params = new URLSearchParams({
    advertiser_id: activeConn.advertiser_id,
    report_type: 'BASIC',
    data_level: 'AUCTION_ADVERTISER',
    dimensions: JSON.stringify(['advertiser_id']),
    metrics: JSON.stringify([
      'spend', 'impressions', 'clicks',
      'complete_payment', 'complete_payment_roas',
      'value_per_complete_payment',
    ]),
    start_date: fmt(start),
    end_date: fmt(end),
    page_size: '10',
  });

  const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params}`;
  const res = await fetch(url, {
    headers: { 'Access-Token': activeConn.access_token },
  });
  const data = await res.json();

  return NextResponse.json({
    connections: conn,
    active_advertiser_id: activeConn.advertiser_id,
    period: { start: fmt(start), end: fmt(end) },
    tiktok_raw: data,
  });
}
