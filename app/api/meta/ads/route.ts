/**
 * GET /api/meta/ads?storeId=...
 * يجلب الإعلانات من meta_ads_cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireMetaRead } from '@/lib/meta/guard';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const guard = await requireMetaRead();
  if (!guard.ok) return guard.error!;

  const storeId = request.nextUrl.searchParams.get('storeId');
  if (!storeId) return NextResponse.json({ error: 'storeId مطلوب' }, { status: 400 });

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('meta_ads_cache')
    .select('id, ad_id, ad_name, campaign_name, adset_name, status, effective_status, creative_preview_url')
    .eq('store_id', storeId)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ads: data || [] });
}
