import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// إنشاء Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

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
  try {
    const supabase = getSupabaseClient();
    
    // جلب الإعدادات من جدول settings
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'dashboard_widgets')
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching settings:', error);
    }
    
    const savedSettings = data?.value ? JSON.parse(data.value) : null;
    const settings = savedSettings ? { ...defaultSettings, ...savedSettings } : defaultSettings;
    
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ settings: defaultSettings });
  }
}

// PUT - تحديث إعدادات لوحة التحكم
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { widgets } = body;

    const settingsValue = {
      widgets: widgets || defaultSettings.widgets,
      updatedAt: new Date().toISOString(),
    };

    // التحقق من وجود السجل
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('key', 'dashboard_widgets')
      .single();

    if (existing) {
      // تحديث السجل الموجود
      const { error } = await supabase
        .from('settings')
        .update({ 
          value: JSON.stringify(settingsValue), 
          updated_at: new Date().toISOString() 
        })
        .eq('key', 'dashboard_widgets');

      if (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ success: false, error: 'فشل في تحديث الإعدادات: ' + error.message }, { status: 500 });
      }
    } else {
      // إنشاء سجل جديد
      const { error } = await supabase
        .from('settings')
        .insert({ 
          key: 'dashboard_widgets', 
          value: JSON.stringify(settingsValue) 
        });

      if (error) {
        console.error('Error creating settings:', error);
        return NextResponse.json({ success: false, error: 'فشل في حفظ الإعدادات: ' + error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      settings: settingsValue,
      message: 'تم حفظ إعدادات لوحة التحكم بنجاح' 
    });
  } catch (error) {
    console.error('Error saving dashboard settings:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ: ' + (error as Error).message }, { status: 500 });
  }
}
