import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/admin/stores/[id]/unassigned-design-tasks
// يُرجع عدد مهام التصميم المفتوحة التي تحتاج إسناداً
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();

  const { count, error } = await supabase
    .from('store_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', params.id)
    .eq('source_type', 'creative_request')
    .not('status', 'in', '("done","canceled")')
    .or('assigned_to.is.null,flags->>needs_designer_assignment.eq.true');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
