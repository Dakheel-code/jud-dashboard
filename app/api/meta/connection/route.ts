/**
 * GET /api/meta/connection?storeId=...
 * يجلب حالة ربط Meta للمتجر (بدون token)
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
  const storeId = request.nextUrl.searchParams.get('storeId');
  if (!storeId) {
    return NextResponse.json({ error: 'storeId مطلوب' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('store_meta_connections')
    .select('id, meta_user_name, ad_account_id, ad_account_name, status, last_sync_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({ connection: null });
  }

  return NextResponse.json({ connection: data });
}
