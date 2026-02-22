-- إضافة حقول البيانات البنكية لجدول المستخدمين
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS bank_name        TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_iban        TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT DEFAULT NULL;
