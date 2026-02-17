import fs from 'fs';
import path from 'path';

// مسار ملف الإعدادات
const BRANDING_FILE = path.join(process.cwd(), 'data', 'branding.json');

// إعدادات افتراضية فارغة (بدون أسماء ثابتة)
const defaultBranding = {
  companyName: '',
  companyNameEn: '',
  logo: '',
  favicon: '',
  primaryColor: '#8b5cf6',
  secondaryColor: '#7c3aed',
};

// قراءة الإعدادات من الملف (Server-Side فقط)
export function getBrandingSync(): typeof defaultBranding {
  try {
    if (fs.existsSync(BRANDING_FILE)) {
      const content = fs.readFileSync(BRANDING_FILE, 'utf-8');
      const saved = JSON.parse(content);
      return { ...defaultBranding, ...saved };
    }
  } catch (error) {
  }
  return defaultBranding;
}

// للاستخدام في metadata
export function getBrandingForMetadata() {
  const branding = getBrandingSync();
  return {
    title: branding.companyName ? `إدارة المتاجر | ${branding.companyName}` : 'إدارة المتاجر',
    description: 'نظام إدارة المتاجر',
    favicon: branding.favicon || '/favicon.gif',
  };
}
