import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

// POST — نقل مهام عضو لموظف آخر
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authenticated) return auth.error!;

    const { fromUserId, toUserId, taskIds } = await request.json();

    if (!fromUserId || !toUserId) {
      return NextResponse.json({ error: 'fromUserId و toUserId مطلوبان' }, { status: 400 });
    }

    const supabase = getAdminClient();

    let query = supabase
      .from('store_tasks')
      .update({ assigned_to: toUserId, updated_at: new Date().toISOString() })
      .eq('assigned_to', fromUserId)
      .not('status', 'in', '("done","canceled")');

    // إذا أُرسلت قائمة محددة
    if (taskIds && taskIds.length > 0) {
      query = supabase
        .from('store_tasks')
        .update({ assigned_to: toUserId, updated_at: new Date().toISOString() })
        .in('id', taskIds)
        .eq('assigned_to', fromUserId);
    }

    const { error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, reassigned: count ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
