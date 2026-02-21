-- إضافة حقول الفوترة لجدول المتاجر
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS billing_type  TEXT    DEFAULT NULL,   -- 'package' | 'custom'
  ADD COLUMN IF NOT EXISTS billing_amount NUMERIC(10,2) DEFAULT NULL;
