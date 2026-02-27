import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── GET /api/creative-requests ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const storeId  = searchParams.get('store_id');
  const status   = searchParams.get('status');
  const type     = searchParams.get('type');

  try {
    let query = supabase
      .from('creative_requests')
      .select(`
        *,
        requested_by_user:admin_users!creative_requests_requested_by_fkey(id, name, avatar),
        assigned_to_user:admin_users!creative_requests_assigned_to_fkey(id, name, avatar),
        task:store_tasks!store_tasks_source_request_id_fkey(id, status, title)
      `)
      .order('created_at', { ascending: false });

    if (storeId)  query = query.eq('store_id', storeId);
    if (status)   query = query.eq('status', status);
    if (type)     query = query.eq('request_type', type);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: data ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ─── POST /api/creative-requests ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = getSupabase();

  try {
    const body = await req.json();
    const {
      store_id,
      request_type = 'design',
      title,
      description,
      priority = 'normal',
      platform,
      attachments = [],
      notes,
      requested_by,
      assigned_to,
      due_date,
    } = body;

    if (!store_id || !title) {
      return NextResponse.json(
        { error: 'store_id و title مطلوبان' },
        { status: 400 }
      );
    }

    // ── إنشاء creative_request (الـ DB Trigger يُنشئ المهمة تلقائياً) ────────
    const { data: request, error: reqErr } = await supabase
      .from('creative_requests')
      .insert({
        store_id,
        request_type,
        title,
        description: description || null,
        status: 'new',
        priority,
        platform: platform || null,
        attachments,
        notes: notes || null,
        requested_by: requested_by || null,
        assigned_to: assigned_to || null,
        due_date: due_date || null,
      })
      .select()
      .single();

    if (reqErr || !request) {
      return NextResponse.json(
        { error: reqErr?.message || 'فشل إنشاء الطلب' },
        { status: 500 }
      );
    }

    // جلب المهمة التي أنشأها الـ Trigger
    const { data: task } = await supabase
      .from('store_tasks')
      .select('id, title, status, assigned_to')
      .eq('source_id', request.id)
      .eq('source_type', 'creative_request')
      .maybeSingle();

    return NextResponse.json({ request, task: task ?? null }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
