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
    const {
      title, request_type = 'design', priority = 'normal', platform, description,
      campaign_goals, campaign_goals_other, has_offer, target_audience,
      content_tone, brand_colors, brand_fonts, discount_code,
      current_discounts, free_shipping, product_links, product_media_links,
    } = body;

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
        store_id:              storeId,
        title:                 title.trim(),
        request_type,
        priority,
        platform:              platform             || null,
        description:           description          || null,
        status:                'new',
        campaign_goals:        campaign_goals        || [],
        campaign_goals_other:  campaign_goals_other  || null,
        has_offer:             has_offer             || null,
        target_audience:       target_audience       || null,
        content_tone:          content_tone          || null,
        brand_colors:          brand_colors          || null,
        brand_fonts:           brand_fonts           || null,
        discount_code:         discount_code         || null,
        current_discounts:     current_discounts     || null,
        free_shipping:         free_shipping         || null,
        product_links:         product_links         || null,
        product_media_links:   product_media_links   || null,
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
