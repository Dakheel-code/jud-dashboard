/**
 * POST /api/meta/select-adaccount
 * Body: { storeId, ad_account_id, ad_account_name }
 * يحفظ اختيار الحساب الإعلاني في store_meta_connections
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireMetaManage } from '@/lib/meta/guard';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const guard = await requireMetaManage();
  if (!guard.ok) return guard.error!;

  let body: { storeId?: string; ad_account_id?: string; ad_account_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body غير صالح' }, { status: 400 });
  }

  const { storeId, ad_account_id, ad_account_name } = body;

  if (!storeId || !ad_account_id) {
    return NextResponse.json({ error: 'storeId و ad_account_id مطلوبان' }, { status: 400 });
  }

  // تأكد أن ad_account_id يبدأ بـ act_
  const accountId = ad_account_id.startsWith('act_')
    ? ad_account_id
    : `act_${ad_account_id}`;

  const supabase = getSupabase();

  const { error } = await supabase
    .from('store_meta_connections')
    .update({
      ad_account_id:   accountId,
      ad_account_name: ad_account_name || null,
      updated_at:      new Date().toISOString(),
    })
    .eq('store_id', storeId)
    .eq('status', 'active');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, ad_account_id: accountId });
}
