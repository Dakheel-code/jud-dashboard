import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/public/store/[id]/brand-identity/upload
// رفع ملف (شعار أو دليل هوية) إلى Supabase Storage
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();
  const storeId = params.id;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) ?? 'logo'; // 'logo' | 'guideline'

    if (!file) return NextResponse.json({ error: 'الملف مطلوب' }, { status: 400 });

    const ext  = file.name.split('.').pop() ?? 'bin';
    const path = `brand-identity/${storeId}/${type}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('designs')
      .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from('designs').getPublicUrl(path);

    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
