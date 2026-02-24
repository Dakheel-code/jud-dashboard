/**
 * GET /api/meta/insights?storeId=...&datePreset=last_7d
 * يجلب ملخص الإحصائيات من meta_insights_cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const storeId    = request.nextUrl.searchParams.get('storeId');
  if (!storeId) return NextResponse.json({ error: 'storeId مطلوب' }, { status: 400 });

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('meta_insights_cache')
    .select('spend, impressions, clicks, reach, ctr, cpc, cpm, conversions, currency')
    .eq('store_id', storeId)
    .order('date_start', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data || data.length === 0) {
    return NextResponse.json({ summary: null });
  }

  // تجميع الإحصائيات
  const summary = data.reduce((acc, row) => ({
    spend:       acc.spend       + (row.spend       || 0),
    impressions: acc.impressions + (row.impressions || 0),
    clicks:      acc.clicks      + (row.clicks      || 0),
    reach:       acc.reach       + (row.reach       || 0),
    conversions: acc.conversions + (row.conversions || 0),
    currency:    row.currency    || acc.currency,
  }), { spend: 0, impressions: 0, clicks: 0, reach: 0, conversions: 0, currency: 'SAR' });

  const ctr = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0;
  const cpc = summary.clicks      > 0 ? summary.spend / summary.clicks : 0;

  return NextResponse.json({ summary: { ...summary, ctr, cpc } });
}
