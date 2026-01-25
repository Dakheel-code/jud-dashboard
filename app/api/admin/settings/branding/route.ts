import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guard';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// مسار ملف الإعدادات
const BRANDING_FILE = path.join(process.cwd(), 'data', 'branding.json');

// التأكد من وجود مجلد data
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// قراءة الإعدادات من الملف
function readBrandingFile(): any {
  try {
    ensureDataDir();
    if (fs.existsSync(BRANDING_FILE)) {
      const content = fs.readFileSync(BRANDING_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error reading branding file:', error);
  }
  return null;
}

// كتابة الإعدادات إلى الملف
function writeBrandingFile(data: any): boolean {
  try {
    ensureDataDir();
    fs.writeFileSync(BRANDING_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing branding file:', error);
    return false;
  }
}

// إعدادات افتراضية (فارغة - يتم تعبئتها من لوحة التحكم)
const defaultBranding = {
  companyName: '',
  companyNameEn: '',
  logo: '',
  favicon: '',
  primaryColor: '#8b5cf6',
  secondaryColor: '#7c3aed',
};

// GET - جلب إعدادات الشركة
export async function GET() {
  try {
    const savedBranding = readBrandingFile();
    const branding = savedBranding ? { ...defaultBranding, ...savedBranding } : defaultBranding;
    
    return NextResponse.json({ branding });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ branding: defaultBranding });
  }
}

// PUT - تحديث إعدادات الشركة
export async function PUT(request: NextRequest) {
  try {
    // التحقق من الجلسة - فقط المسؤولين
    const auth = await requireAdmin();
    if (!auth.authenticated) {
      return auth.error!;
    }

    const body = await request.json();
    const { companyName, companyNameEn, logo, favicon, primaryColor, secondaryColor } = body;

    const brandingValue = {
      companyName: companyName || '',
      companyNameEn: companyNameEn || '',
      logo: logo || '',
      favicon: favicon || '',
      primaryColor: primaryColor || '#8b5cf6',
      secondaryColor: secondaryColor || '#7c3aed',
      updatedAt: new Date().toISOString(),
    };

    // حفظ في ملف JSON
    const success = writeBrandingFile(brandingValue);
    
    if (!success) {
      return NextResponse.json({ error: 'فشل في حفظ الإعدادات' }, { status: 500 });
    }

    console.log('Branding saved successfully:', brandingValue.companyName);

    return NextResponse.json({ 
      success: true, 
      branding: brandingValue,
      message: 'تم حفظ إعدادات الشركة بنجاح' 
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
