import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { 
          error: 'قاعدة البيانات غير مُعدة',
          details: 'يرجى إعداد Supabase وإضافة متغيرات البيئة في ملف .env.local'
        },
        { status: 503 }
      );
    }


    const supabase = createClient(supabaseUrl, supabaseKey);

    const { store_url } = await request.json();

    if (!store_url || typeof store_url !== 'string') {
      return NextResponse.json(
        { error: 'رابط المتجر مطلوب' },
        { status: 400 }
      );
    }

    // البحث عن المتجر
    const { data: existingStore, error: fetchError } = await supabase
      .from('stores')
      .select('id')
      .eq('store_url', store_url)
      .single();


    if (fetchError && fetchError.code !== 'PGRST116') {
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

    // إنشاء متجر جديد
    const { data: newStore, error: insertError } = await supabase
      .from('stores')
      .insert([{ store_url }])
      .select('id')
      .single();


    if (insertError) {
      return NextResponse.json(
        { 
          error: 'فشل في إنشاء المتجر',
          details: insertError.message 
        },
        { status: 500 }
      );
    }

    
    // إرسال إشعار Slack للمتجر الجديد
    try {
      // جلب معلومات المتجر (الاسم والأيقونة)
      let storeName = store_url;
      let storeLogo = null;
      
      try {
        const metadataRes = await fetch(`${request.nextUrl.origin}/api/store/metadata?url=${encodeURIComponent(store_url)}`);
        if (metadataRes.ok) {
          const metadata = await metadataRes.json();
          storeName = metadata.name || store_url;
          storeLogo = metadata.logo || null;
        }
      } catch (metaError) {
      }
      
      await fetch(`${request.nextUrl.origin}/api/admin/slack/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_store',
          data: { 
            store_url, 
            store_id: newStore.id,
            store_name: storeName,
            store_logo: storeLogo
          }
        })
      });
    } catch (slackError) {
    }
    
    return NextResponse.json({ store_id: newStore.id });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'خطأ في الخادم',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
