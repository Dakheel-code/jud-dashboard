import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/public/store/[id]
// صفحة عامة — بدون auth — تُرجع بيانات المتجر + طلباته
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();
  const storeId = params.id;

  const [storeRes, requestsRes, tasksRes] = await Promise.all([
    supabase
      .from('stores')
      .select('id, store_name, store_url, status, meta_account, snapchat_account, tiktok_account')
      .eq('id', storeId)
      .single(),

    supabase
      .from('creative_requests')
      .select(`
        id, title, request_type, status, priority, platform,
        description, result_files, client_feedback, client_feedback_note,
        client_feedback_at, created_at, updated_at
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false }),

    supabase
      .from('store_tasks')
      .select('id, title, description, status, priority, type, category, is_done, due_date, created_at')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false }),
  ]);

  if (storeRes.error || !storeRes.data) {
    return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 });
  }

  return NextResponse.json({
    store:    storeRes.data,
    requests: requestsRes.data ?? [],
    tasks:    tasksRes.data    ?? [],
  });
}
