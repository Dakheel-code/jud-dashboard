-- إضافة عمود roles لدعم أدوار متعددة للمستخدم
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS roles JSONB DEFAULT '[]'::jsonb;

-- تحديث المستخدمين الحاليين لنقل role إلى roles
UPDATE admin_users 
SET roles = jsonb_build_array(role) 
WHERE roles IS NULL OR roles = '[]'::jsonb;

-- إنشاء index للبحث في الأدوار
CREATE INDEX IF NOT EXISTS idx_admin_users_roles ON admin_users USING GIN (roles);
