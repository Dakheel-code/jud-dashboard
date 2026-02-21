-- إضافة حقل الراتب الشهري لجدول المستخدمين
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(10, 2) DEFAULT NULL;
