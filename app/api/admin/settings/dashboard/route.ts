import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// مسار ملف الإعدادات
const DASHBOARD_SETTINGS_FILE = path.join(process.cwd(), 'data', 'dashboard-settings.json');

// التأكد من وجود مجلد data
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// قراءة الإعدادات من الملف
function readSettingsFile(): any {
  try {
    ensureDataDir();
    if (fs.existsSync(DASHBOARD_SETTINGS_FILE)) {
      const content = fs.readFileSync(DASHBOARD_SETTINGS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error reading dashboard settings file:', error);
  }
  return null;
}

// كتابة الإعدادات إلى الملف
function writeSettingsFile(data: any): boolean {
  try {
    ensureDataDir();
    fs.writeFileSync(DASHBOARD_SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing dashboard settings file:', error);
    return false;
  }
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
    const savedSettings = readSettingsFile();
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
    // التحقق من الجلسة - فقط المسؤولين
    const auth = await requireAdmin();
    console.log('Auth result:', auth.authenticated, auth.user?.role);
    if (!auth.authenticated) {
      console.log('Auth failed');
      return auth.error!;
    }

    const body = await request.json();
    const { widgets } = body;
    console.log('Received widgets:', Object.keys(widgets || {}));

    const settingsValue = {
      widgets: widgets || defaultSettings.widgets,
      updatedAt: new Date().toISOString(),
    };

    // حفظ في ملف JSON
    const success = writeSettingsFile(settingsValue);
    console.log('Write success:', success);
    
    if (!success) {
      return NextResponse.json({ error: 'فشل في حفظ الإعدادات' }, { status: 500 });
    }

    console.log('Dashboard settings saved successfully');

    return NextResponse.json({ 
      success: true, 
      settings: settingsValue,
      message: 'تم حفظ إعدادات لوحة التحكم بنجاح' 
    });
  } catch (error) {
    console.error('Error saving dashboard settings:', error);
    return NextResponse.json({ error: 'حدث خطأ: ' + (error as Error).message }, { status: 500 });
  }
}
