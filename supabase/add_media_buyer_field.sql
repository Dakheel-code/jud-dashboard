-- إضافة حقل media_buyer_id لجدول stores
-- يجب تشغيل هذا الاستعلام في Supabase SQL Editor

-- إضافة حقل media_buyer_id
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS media_buyer_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- إضافة index للحقل الجديد
CREATE INDEX IF NOT EXISTS idx_stores_media_buyer ON stores(media_buyer_id);

-- إضافة حقول إضافية قد تكون مفقودة
ALTER TABLE stores ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS budget TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS store_group_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS client_id UUID;

-- تحديث الـ schema لإضافة الحقول للـ admin_users إذا لم تكن موجودة
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS avatar TEXT;
