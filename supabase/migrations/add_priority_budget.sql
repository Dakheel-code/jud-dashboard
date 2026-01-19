-- إضافة أعمدة الأولوية والميزانية وحالة المتجر لجدول المتاجر
-- يجب تنفيذ هذا في Supabase Dashboard -> SQL Editor

ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS budget TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';

-- تحديث المتاجر الموجودة
UPDATE stores SET priority = 'medium' WHERE priority IS NULL;
UPDATE stores SET status = 'new' WHERE status IS NULL;
