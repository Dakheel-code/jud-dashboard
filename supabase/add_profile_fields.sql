-- إضافة حقول الملف الشخصي لجدول admin_users
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS avatar TEXT;
