import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/public/store/[id]/requests
// إنشاء طلب جديد من العميل (بدون auth)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();
  const storeId = params.id;

  try {
    const body = await req.json();
    const { title, request_type = 'design', priority = 'normal', platform, description } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'العنوان مطلوب' }, { status: 400 });
    }

    // التحقق من وجود المتجر
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .single();

    if (!store) {
      return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 });
    }

    const { data: request, error } = await supabase
      .from('creative_requests')
      .insert({
        store_id:     storeId,
        title:        title.trim(),
        request_type,
        priority,
        platform:     platform || null,
        description:  description || null,
        status:       'new',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // جلب المهمة التي أنشأها الـ Trigger
    const { data: task } = await supabase
      .from('store_tasks')
      .select('id, title, status')
      .eq('source_id', request.id)
      .eq('source_type', 'creative_request')
      .maybeSingle();

    return NextResponse.json({ request, task: task ?? null }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
