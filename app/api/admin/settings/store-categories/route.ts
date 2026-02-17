import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database configuration error');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// التصنيفات الافتراضية
const DEFAULT_CATEGORIES = [
  'ملابس',
  'عطور',
  'إلكترونيات',
  'أجهزة منزلية',
  'مستحضرات تجميل',
  'أحذية وحقائب',
  'مجوهرات وإكسسوارات',
  'أثاث ومفروشات',
  'ألعاب أطفال',
  'رياضة ولياقة',
  'صحة وعناية',
  'أغذية ومشروبات',
  'كتب وقرطاسية',
  'سيارات وقطع غيار',
  'حيوانات أليفة',
  'هدايا وتغليف',
  'أخرى'
];

// GET - جلب التصنيفات
export async function GET() {
  try {
    const supabase = getSupabaseClient();

    // جلب التصنيفات من جدول الإعدادات
    const { data: settings, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'store_categories')
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ categories: DEFAULT_CATEGORIES });
    }

    if (settings?.value) {
      try {
        const categories = JSON.parse(settings.value);
        return NextResponse.json({ categories });
      } catch {
        return NextResponse.json({ categories: DEFAULT_CATEGORIES });
      }
    }

    return NextResponse.json({ categories: DEFAULT_CATEGORIES });
  } catch (error) {
    return NextResponse.json({ categories: DEFAULT_CATEGORIES });
  }
}

// POST - حفظ التصنيفات
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { categories } = body;

    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: 'التصنيفات يجب أن تكون قائمة' }, { status: 400 });
    }

    // التحقق من وجود السجل
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('key', 'store_categories')
      .single();

    if (existing) {
      // تحديث السجل الموجود
      const { error } = await supabase
        .from('settings')
        .update({ value: JSON.stringify(categories), updated_at: new Date().toISOString() })
        .eq('key', 'store_categories');

      if (error) {
        return NextResponse.json({ error: 'فشل تحديث التصنيفات' }, { status: 500 });
      }
    } else {
      // إنشاء سجل جديد
      const { error } = await supabase
        .from('settings')
        .insert({ key: 'store_categories', value: JSON.stringify(categories) });

      if (error) {
        return NextResponse.json({ error: 'فشل حفظ التصنيفات' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
