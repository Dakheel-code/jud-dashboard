/**
 * POST /api/meta/disconnect
 * Body: { storeId }
 * يلغي ربط ميتا للمتجر ويحذف الكاش
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

  let body: { storeId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body غير صالح' }, { status: 400 });
  }

  const { storeId } = body;
  if (!storeId) {
    return NextResponse.json({ error: 'storeId مطلوب' }, { status: 400 });
  }

  const supabase = getSupabase();

  // تحديث الحالة إلى revoked (لا نحذف — للتدقيق)
  const { error: connErr } = await supabase
    .from('store_meta_connections')
    .update({
      status:     'revoked',
      updated_at: new Date().toISOString(),
    })
    .eq('store_id', storeId);

  if (connErr) {
    return NextResponse.json({ error: connErr.message }, { status: 500 });
  }

  // حذف كاش الإعلانات والإحصائيات
  await supabase.from('meta_ads_cache').delete().eq('store_id', storeId);
  await supabase.from('meta_insights_cache').delete().eq('store_id', storeId);

  return NextResponse.json({ success: true });
}
