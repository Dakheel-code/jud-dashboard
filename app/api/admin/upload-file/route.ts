import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('user_id') as string;

    if (!file) {
      return NextResponse.json({ error: 'لم يتم تحديد ملف' }, { status: 400 });
    }

    // التحقق من حجم الملف (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'حجم الملف يتجاوز 5 ميجابايت' }, { status: 400 });
    }

    // التحقق من نوع الملف
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'نوع الملف غير مدعوم. يرجى رفع PDF أو صورة' }, { status: 400 });
    }

    // إنشاء اسم فريد للملف
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `medical-reports/${userId || 'unknown'}/${timestamp}.${fileExtension}`;

    // تحويل الملف إلى ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // رفع الملف إلى Supabase Storage
    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      // إذا كان الـ bucket غير موجود، نحاول إنشاءه
      if (error.message.includes('bucket') || error.message.includes('not found')) {
        return NextResponse.json({ 
          error: 'مجلد التخزين غير موجود. يرجى إنشاء bucket باسم "uploads" في Supabase Storage',
          details: error.message 
        }, { status: 500 });
      }
      return NextResponse.json({ error: 'فشل في رفع الملف', details: error.message }, { status: 500 });
    }

    // الحصول على رابط الملف العام
    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(fileName);

    return NextResponse.json({ 
      success: true,
      url: urlData.publicUrl,
      path: data.path,
      fileName: file.name
    });

  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ في رفع الملف' }, { status: 500 });
  }
}
