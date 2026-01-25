-- جدول إعدادات التطبيق العامة
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة الإعدادات الافتراضية للشركة
INSERT INTO app_settings (key, value) VALUES (
  'branding',
  '{
    "companyName": "جود",
    "companyNameEn": "JUD",
    "logo": "/logo.png",
    "favicon": "/favicon.gif",
    "primaryColor": "#8b5cf6",
    "secondaryColor": "#7c3aed"
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- تفعيل RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة للجميع
CREATE POLICY "Allow read access to app_settings" ON app_settings
  FOR SELECT USING (true);

-- سياسة الكتابة للمصادقين فقط
CREATE POLICY "Allow authenticated users to update app_settings" ON app_settings
  FOR ALL USING (true);
