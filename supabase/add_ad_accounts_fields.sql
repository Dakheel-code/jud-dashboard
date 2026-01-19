-- إضافة حقول الحسابات الإعلانية لجدول المتاجر
ALTER TABLE stores ADD COLUMN IF NOT EXISTS snapchat_account TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS tiktok_account TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS google_account TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS meta_account TEXT;

-- إنشاء جدول الإعدادات إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
