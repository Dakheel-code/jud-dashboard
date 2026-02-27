import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/public/store/[id]/requests/[reqId]/feedback
// العميل يعتمد أو يطلب تعديل (بدون auth)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; reqId: string } }
) {
  const supabase = getSupabase();

  try {
    const { feedback, note } = await req.json();

    if (!['approved', 'revision_requested'].includes(feedback)) {
      return NextResponse.json({ error: 'feedback غير صالح' }, { status: 400 });
    }

    // تأكد أن الطلب ينتمي لهذا المتجر
    const { data: existing } = await supabase
      .from('creative_requests')
      .select('id, status')
      .eq('id', params.reqId)
      .eq('store_id', params.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    }

    const newStatus = feedback === 'approved' ? 'done' : 'in_progress';

    const { data, error } = await supabase
      .from('creative_requests')
      .update({
        client_feedback:      feedback,
        client_feedback_note: note || null,
        client_feedback_at:   new Date().toISOString(),
        status:               newStatus,
        updated_at:           new Date().toISOString(),
      })
      .eq('id', params.reqId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ request: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
