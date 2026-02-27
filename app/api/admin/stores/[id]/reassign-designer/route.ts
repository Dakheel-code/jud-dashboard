import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/admin/stores/[id]/reassign-designer
// يُعيد إسناد مهام التصميم المفتوحة (بدون مصمم أو needs_designer_assignment) للمصمم الجديد
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();
  const { id: storeId } = params;

  try {
    const { designer_id } = await req.json();

    if (!designer_id) {
      return NextResponse.json({ error: 'designer_id مطلوب' }, { status: 400 });
    }

    // استدعاء DB Function
    const { data, error } = await supabase.rpc('reassign_design_tasks', {
      p_store_id:    storeId,
      p_designer_id: designer_id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success:        true,
      updated_count:  data as number,
      message:        `تم إعادة إسناد ${data} مهمة للمصمم`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
