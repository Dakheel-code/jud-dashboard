import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// إعدادات افتراضية - جميع الويدجتس مفعلة
const defaultSettings = {
  widgets: {
    kpi_bar: { enabled: true, order: 1, label: 'شريط المؤشرات' },
    action_center: { enabled: true, order: 2, label: 'يحتاج تدخل الآن' },
    store_performance: { enabled: true, order: 3, label: 'أداء المتاجر' },
    team_performance: { enabled: true, order: 4, label: 'أداء الفريق' },
    marketing_pulse: { enabled: true, order: 5, label: 'نبض التسويق' },
    account_managers: { enabled: true, order: 6, label: 'مدراء العلاقات' },
    managers_charts: { enabled: true, order: 7, label: 'تحليلات الأداء' },
    today_tasks: { enabled: true, order: 8, label: 'مهام اليوم' },
    announcements: { enabled: true, order: 9, label: 'الإعلانات' },
    smart_insights: { enabled: true, order: 10, label: 'الرؤى الذكية' },
  },
  updatedAt: null,
};

// GET - جلب إعدادات لوحة التحكم
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('GET: Missing Supabase credentials');
    return NextResponse.json({ settings: defaultSettings });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'dashboard_widgets')
      .maybeSingle();
    
    if (error) {
      console.error('GET Error:', error);
      return NextResponse.json({ settings: defaultSettings });
    }
    
    if (data?.value) {
      try {
        const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        const mergedSettings = {
          ...defaultSettings,
          widgets: { ...defaultSettings.widgets, ...parsed.widgets },
          updatedAt: parsed.updatedAt
        };
        return NextResponse.json({ settings: mergedSettings });
      } catch (parseError) {
        console.error('Parse error:', parseError);
        return NextResponse.json({ settings: defaultSettings });
      }
    }
    
    return NextResponse.json({ settings: defaultSettings });
  } catch (error) {
    console.error('GET Exception:', error);
    return NextResponse.json({ settings: defaultSettings });
  }
}

// PUT - تحديث إعدادات لوحة التحكم
export async function PUT(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('PUT: Missing Supabase credentials');
    return NextResponse.json({ success: false, error: 'خطأ في إعدادات قاعدة البيانات' }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    const { widgets } = body;

    if (!widgets) {
      return NextResponse.json({ success: false, error: 'لم يتم إرسال بيانات الويدجتات' }, { status: 400 });
    }

    const settingsValue = {
      widgets: widgets,
      updatedAt: new Date().toISOString(),
    };

    const valueString = JSON.stringify(settingsValue);

    // التحقق من وجود السجل
    const { data: existing, error: selectError } = await supabase
      .from('settings')
      .select('id, key')
      .eq('key', 'dashboard_widgets')
      .maybeSingle();

    if (selectError) {
      console.error('SELECT Error:', selectError);
      return NextResponse.json({ success: false, error: 'خطأ في قراءة الإعدادات: ' + selectError.message }, { status: 500 });
    }

    let saveError = null;

    if (existing) {
      // تحديث السجل الموجود
      const { error: updateError } = await supabase
        .from('settings')
        .update({ 
          value: valueString, 
          updated_at: new Date().toISOString() 
        })
        .eq('key', 'dashboard_widgets');

      saveError = updateError;
    } else {
      // إنشاء سجل جديد
      const { error: insertError } = await supabase
        .from('settings')
        .insert({ 
          key: 'dashboard_widgets', 
          value: valueString 
        });

      saveError = insertError;
    }

    if (saveError) {
      console.error('SAVE Error:', saveError);
      return NextResponse.json({ 
        success: false, 
        error: 'فشل في حفظ الإعدادات: ' + saveError.message,
        details: saveError
      }, { status: 500 });
    }

    // التحقق من نجاح الحفظ بقراءة البيانات مرة أخرى
    const { data: verifyData, error: verifyError } = await supabase
      .from('settings')
      .select('value, updated_at')
      .eq('key', 'dashboard_widgets')
      .single();

    if (verifyError || !verifyData) {
      console.error('VERIFY Error:', verifyError);
      return NextResponse.json({ 
        success: false, 
        error: 'فشل في التحقق من الحفظ'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      settings: settingsValue,
      message: 'تم حفظ إعدادات لوحة التحكم بنجاح',
      savedAt: verifyData.updated_at
    });
  } catch (error) {
    console.error('PUT Exception:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'حدث خطأ غير متوقع: ' + (error as Error).message 
    }, { status: 500 });
  }
}
