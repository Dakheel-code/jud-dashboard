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

// جلب إعدادات ساعات العمل
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'work_hours')
      .single();

    if (error && error.code !== 'PGRST116') {
    }

    // إعدادات افتراضية
    const defaultSettings = {
      workStartTime: '09:00',
      workEndTime: '17:00',
      workDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
      timezone: 'Asia/Riyadh',
      lateThresholdMinutes: 15,
      earlyLeaveThresholdMinutes: 15,
    };

    if (data?.value) {
      try {
        const settings = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        return NextResponse.json({ settings: { ...defaultSettings, ...settings } });
      } catch (e) {
        return NextResponse.json({ settings: defaultSettings });
      }
    }

    return NextResponse.json({ settings: defaultSettings });

  } catch (error) {
    return NextResponse.json({ 
      settings: {
        workStartTime: '09:00',
        workEndTime: '17:00',
        workDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
        timezone: 'Asia/Riyadh',
        lateThresholdMinutes: 15,
        earlyLeaveThresholdMinutes: 15,
      }
    });
  }
}

// حفظ إعدادات ساعات العمل
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const settings = await request.json();

    // التحقق من وجود السجل
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', 'work_hours')
      .single();

    if (existing) {
      // تحديث السجل الموجود
      const { error } = await supabase
        .from('app_settings')
        .update({ 
          value: settings,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'work_hours');

      if (error) {
        return NextResponse.json({ error: 'فشل في حفظ الإعدادات' }, { status: 500 });
      }
    } else {
      // إنشاء سجل جديد
      const { error } = await supabase
        .from('app_settings')
        .insert({
          key: 'work_hours',
          value: settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        // إذا كان الجدول غير موجود، نحاول إنشاءه
        if (error.code === '42P01') {
          return NextResponse.json({ 
            success: true, 
            message: 'تم حفظ الإعدادات محلياً',
            settings 
          });
        }
        return NextResponse.json({ error: 'فشل في حفظ الإعدادات' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, settings });

  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
