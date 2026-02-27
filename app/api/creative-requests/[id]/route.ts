import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── GET /api/creative-requests/[id] ─────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('creative_requests')
    .select(`
      *,
      requested_by_user:admin_users!creative_requests_requested_by_fkey(id, name, avatar),
      assigned_to_user:admin_users!creative_requests_assigned_to_fkey(id, name, avatar),
      task:store_tasks!store_tasks_source_request_id_fkey(id, status, title, assigned_to)
    `)
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ request: data });
}

// ─── PATCH /api/creative-requests/[id] ───────────────────────────────────────
// يُحدّث حالة الطلب ويُزامن حالة المهمة المرتبطة
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();

  try {
    const body = await req.json();
    const { status, assigned_to, notes, due_date, priority } = body;

    // حقول مسموح بتحديثها
    const updates: Record<string, any> = {};
    if (status      !== undefined) updates.status      = status;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (notes       !== undefined) updates.notes       = notes;
    if (due_date    !== undefined) updates.due_date     = due_date;
    if (priority    !== undefined) updates.priority     = priority;

    // إضافة completed_at عند الإنجاز
    if (status === 'done')     updates.completed_at = new Date().toISOString();
    if (status === 'canceled') updates.completed_at = null;

    const { data: request, error } = await supabase
      .from('creative_requests')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // ── مزامنة حالة المهمة المرتبطة ──────────────────────────────────────────
    const STATUS_MAP: Record<string, string> = {
      new:          'open',
      waiting_info: 'waiting',
      in_progress:  'in_progress',
      review:       'waiting',
      done:         'done',
      rejected:     'canceled',
      canceled:     'canceled',
    };

    if (status && STATUS_MAP[status]) {
      const taskUpdates: Record<string, any> = {
        status: STATUS_MAP[status],
      };
      if (assigned_to !== undefined) taskUpdates.assigned_to = assigned_to;
      if (due_date    !== undefined) taskUpdates.due_date     = due_date;
      if (status === 'done')         taskUpdates.completed_at = new Date().toISOString();

      await supabase
        .from('store_tasks')
        .update(taskUpdates)
        .eq('source_request_id', params.id);
    }

    return NextResponse.json({ request });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ─── DELETE /api/creative-requests/[id] ──────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();

  // تحديث المهمة المرتبطة إلى canceled أولاً
  await supabase
    .from('store_tasks')
    .update({ status: 'canceled' })
    .eq('source_request_id', params.id);

  const { error } = await supabase
    .from('creative_requests')
    .delete()
    .eq('id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
