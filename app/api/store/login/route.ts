import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { 
          error: 'قاعدة البيانات غير مُعدة',
          details: 'يرجى إعداد Supabase وإضافة متغيرات البيئة في ملف .env.local'
        },
        { status: 503 }
      );
    }

    const { store_url } = await request.json();

    if (!store_url || typeof store_url !== 'string') {
      return NextResponse.json(
        { error: 'رابط المتجر مطلوب' },
        { status: 400 }
      );
    }

    const { data: existingStore, error: fetchError } = await supabase
      .from('stores')
      .select('id')
      .eq('store_url', store_url)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Supabase fetch error:', fetchError);
      return NextResponse.json(
        { 
          error: 'خطأ في الاتصال بقاعدة البيانات',
          details: fetchError.message 
        },
        { status: 500 }
      );
    }

    if (existingStore) {
      return NextResponse.json({ store_id: existingStore.id });
    }

    const { data: newStore, error: insertError } = await supabase
      .from('stores')
      .insert([{ store_url }])
      .select('id')
      .single();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      return NextResponse.json(
        { 
          error: 'فشل في إنشاء المتجر',
          details: insertError.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ store_id: newStore.id });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: 'خطأ في الخادم',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
