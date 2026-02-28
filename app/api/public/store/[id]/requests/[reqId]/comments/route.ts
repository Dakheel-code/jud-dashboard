import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/public/store/[id]/requests/[reqId]/comments
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; reqId: string } }
) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('request_comments')
    .select('id, request_id, body, author_name, author_role, file_urls, created_at')
    .eq('request_id', params.reqId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(
    { comments: data ?? [] },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

// POST /api/public/store/[id]/requests/[reqId]/comments
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; reqId: string } }
) {
  const supabase = getSupabase();
  try {
    const { body, author_name, author_role = 'client', file_urls } = await req.json();
    if (!body?.trim() && (!file_urls || file_urls.length === 0)) {
      return NextResponse.json({ error: 'التعليق أو الملف مطلوب' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('request_comments')
      .insert({
        request_id:  params.reqId,
        body:        body?.trim() || null,
        author_name: author_name || 'العميل',
        author_role,
        file_urls:   file_urls || [],
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
