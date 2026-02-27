import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/admin/designs — جلب كل طلبات التصاميم مع بيانات المتجر
export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const storeId  = req.nextUrl.searchParams.get('store_id');

  let query = supabase
    .from('creative_requests')
    .select(`
      id, title, request_type, status, priority, platform,
      description, result_files, created_at, updated_at,
      store_id,
      campaign_goals, campaign_goals_other, has_offer, target_audience,
      content_tone, brand_colors, brand_fonts, discount_code,
      current_discounts, free_shipping, product_links, product_media_links,
      stores ( id, store_name, store_url )
    `)
    .order('created_at', { ascending: false });

  if (storeId) query = query.eq('store_id', storeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { requests: data ?? [] },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } }
  );
}

// DELETE /api/admin/designs?id=... — حذف الطلب
export async function DELETE(req: NextRequest) {
  const supabase = getSupabase();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });

  const { error } = await supabase
    .from('creative_requests')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH /api/admin/designs — تحديث حالة الطلب
export async function PATCH(req: NextRequest) {
  const supabase = getSupabase();
  try {
    const { id, status, assigned_to } = await req.json();
    if (!id || !status) return NextResponse.json({ error: 'id و status مطلوبان' }, { status: 400 });

    const updates: any = { status, updated_at: new Date().toISOString() };
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    // عند إعادة التصميم للمراجعة — امسح الـ feedback القديم حتى تظهر أزرار الاعتماد
    if (status === 'review') {
      updates.client_feedback      = null;
      updates.client_feedback_note = null;
      updates.client_feedback_at   = null;
    }

    const { data, error } = await supabase
      .from('creative_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ request: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
