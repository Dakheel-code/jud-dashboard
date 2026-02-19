import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) return auth.error!;

    const supabase = getAdminClient();
    const userId = params.id;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all | today | top3

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    let query = supabase
      .from('store_tasks')
      .select(`
        id, title, description, status, priority, due_date, created_at, updated_at,
        store:stores(id, store_name, store_url)
      `)
      .eq('assigned_to', userId)
      .not('status', 'in', '("done","canceled")');

    if (filter === 'today') {
      query = query
        .not('due_date', 'is', null)
        .gte('due_date', todayStart)
        .lt('due_date', todayEnd);
    }

    const { data: tasks, error } = await query
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(filter === 'top3' ? 50 : 100);

    if (error) {
      return NextResponse.json({ error: 'فشل جلب المهام' }, { status: 500 });
    }

    let result = tasks || [];

    // Top 3: أقرب due_date + أعلى priority
    if (filter === 'top3') {
      result = [...result].sort((a, b) => {
        const pA = PRIORITY_ORDER[a.priority] ?? 9;
        const pB = PRIORITY_ORDER[b.priority] ?? 9;
        if (pA !== pB) return pA - pB;
        if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      }).slice(0, 3);
    }

    return NextResponse.json({ tasks: result });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — تغيير حالة مهمة سريع
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) return auth.error!;

    const supabase = getAdminClient();
    const { taskId, status, closing_note } = await request.json();

    if (!taskId || !status) {
      return NextResponse.json({ error: 'taskId و status مطلوبان' }, { status: 400 });
    }

    const updateData: any = { status, updated_at: new Date().toISOString() };
    if (closing_note) updateData.description = closing_note;

    const { data, error } = await supabase
      .from('store_tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('assigned_to', params.id)
      .select('id, status, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, task: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
