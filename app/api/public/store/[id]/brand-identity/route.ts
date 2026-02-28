import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/public/store/[id]/brand-identity
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('brand_identity')
    .select('*')
    .eq('store_id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { identity: data ?? null },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

// POST /api/public/store/[id]/brand-identity — حفظ أو تحديث هوية المتجر
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase();
  const storeId = params.id;

  try {
    const body = await req.json();
    const { brand_colors, fonts, notes, logo_urls, guideline_urls } = body;

    const payload = {
      store_id:       storeId,
      brand_colors:   brand_colors   ?? null,
      fonts:          fonts          ?? null,
      notes:          notes          ?? null,
      logo_urls:      logo_urls      ?? [],
      guideline_urls: guideline_urls ?? [],
      updated_at:     new Date().toISOString(),
    };

    // upsert بناءً على store_id
    const { data, error } = await supabase
      .from('brand_identity')
      .upsert(payload, { onConflict: 'store_id' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ identity: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
