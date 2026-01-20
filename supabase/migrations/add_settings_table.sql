-- إنشاء جدول الإعدادات
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- إضافة قالب التحديث اليومي الافتراضي
INSERT INTO settings (key, value) 
VALUES ('whatsapp_templates', '{"daily_update": "مرحباً {store_name}،\n\nالتحديث اليومي:\n📊 المبيعات: {sales}\n💰 العائد: {revenue}\n💸 الصرف: {spend}\n\nشكراً لتعاونكم"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
