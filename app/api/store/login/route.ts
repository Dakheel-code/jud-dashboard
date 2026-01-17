import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('=== STORE LOGIN REQUEST ===');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials missing');
      return NextResponse.json(
        { 
          error: 'قاعدة البيانات غير مُعدة',
          details: 'يرجى إعداد Supabase وإضافة متغيرات البيئة في ملف .env.local'
        },
        { status: 503 }
      );
    }

    console.log('✅ Supabase URL:', supabaseUrl);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { store_url } = await request.json();
    console.log('📝 Store URL:', store_url);

    if (!store_url || typeof store_url !== 'string') {
      return NextResponse.json(
        { error: 'رابط المتجر مطلوب' },
        { status: 400 }
      );
    }

    // البحث عن المتجر
    console.log('🔍 Searching for existing store...');
    const { data: existingStore, error: fetchError } = await supabase
      .from('stores')
      .select('id')
      .eq('store_url', store_url)
      .single();

    console.log('Search result:', { existingStore, fetchError });

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Supabase fetch error:', fetchError);
      return NextResponse.json(
        { 
          error: 'خطأ في الاتصال بقاعدة البيانات',
          details: fetchError.message 
        },
        { status: 500 }
      );
    }

    if (existingStore) {
      console.log('✅ Existing store found:', existingStore.id);
      return NextResponse.json({ store_id: existingStore.id });
    }

    // إنشاء متجر جديد
    console.log('📦 Creating new store...');
    const { data: newStore, error: insertError } = await supabase
      .from('stores')
      .insert([{ store_url }])
      .select('id')
      .single();

    console.log('Insert result:', { newStore, insertError });

    if (insertError) {
      console.error('❌ Supabase insert error:', insertError);
      return NextResponse.json(
        { 
          error: 'فشل في إنشاء المتجر',
          details: insertError.message 
        },
        { status: 500 }
      );
    }

    console.log('✅ New store created:', newStore.id);
    
    // إرسال إشعار Slack للمتجر الجديد
    try {
      await fetch(`${request.nextUrl.origin}/api/admin/slack/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_store',
          data: { store_url, store_id: newStore.id }
        })
      });
    } catch (slackError) {
      console.error('Slack notification error:', slackError);
    }
    
    return NextResponse.json({ store_id: newStore.id });
  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json(
      { 
        error: 'خطأ في الخادم',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
