import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/public/store/[id]/requests-only
// endpoint خفيف — يجلب الطلبات فقط بدون المهام والمتجر (للـ polling السريع)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('creative_requests')
    .select(`
      id, title, request_type, status, priority, platform,
      description, result_files, client_feedback, client_feedback_note,
      client_feedback_at, created_at, updated_at
    `)
    .eq('store_id', params.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { requests: data ?? [] },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Surrogate-Control': 'no-store',
        'CDN-Cache-Control': 'no-store',
      },
    }
  );
}
