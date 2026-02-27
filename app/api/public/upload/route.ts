import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/public/upload — رفع ملف إلى Supabase Storage
export async function POST(req: NextRequest) {
  try {
    const form      = await req.formData();
    const file      = form.get('file') as File | null;
    const requestId = form.get('request_id') as string | null;

    if (!file) return NextResponse.json({ error: 'لا يوجد ملف' }, { status: 400 });

    const supabase  = getSupabase();
    const ext       = file.name.split('.').pop() ?? 'bin';
    const path      = `comments/${requestId ?? 'misc'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const buffer    = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from('request-files')
      .upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage
      .from('request-files')
      .getPublicUrl(path);

    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
