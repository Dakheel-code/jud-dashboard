-- =====================================================
-- Migration: Team Linking & Tasks Schema
-- Date: 2026-01-22
-- Description: 
--   1.1 إضافة أعمدة ربط الفريق في جدول المتاجر
--   1.2 إنشاء جدول المهام الشامل
--   1.3 إنشاء جدول المشاركين في المهام
-- =====================================================

-- =====================================================
-- 1.1 تعديل جدول المتاجر Stores
-- إضافة عمود team_leader_user_id (الأعمدة الأخرى موجودة مسبقاً)
-- =====================================================

-- التحقق من وجود العمود قبل إضافته
DO $$ 
BEGIN
    -- إضافة عمود team_leader_user_id إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stores' AND column_name = 'team_leader_user_id'
    ) THEN
        ALTER TABLE stores 
        ADD COLUMN team_leader_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN stores.team_leader_user_id IS 'قائد الفريق المسؤول عن المتجر';
    END IF;

    -- التأكد من وجود عمود manager_user_id (اسم بديل لـ account_manager_id)
    -- ملاحظة: account_manager_id موجود مسبقاً، نضيف alias إذا لزم الأمر
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'stores' AND column_name = 'manager_user_id'
    ) THEN
        -- إذا كنت تريد عمود منفصل بدلاً من account_manager_id
        -- ALTER TABLE stores ADD COLUMN manager_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL;
        -- أو يمكن استخدام account_manager_id الموجود
        NULL; -- account_manager_id موجود مسبقاً
    END IF;
END $$;

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_stores_team_leader ON stores(team_leader_user_id);
CREATE INDEX IF NOT EXISTS idx_stores_account_manager ON stores(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_stores_media_buyer ON stores(media_buyer_id);

-- =====================================================
-- 1.2 إنشاء جدول المهام Tasks (الجديد الشامل)
-- =====================================================

-- حذف الجدول إذا كان موجوداً (احذف هذا السطر في الإنتاج!)
-- DROP TABLE IF EXISTS store_tasks CASCADE;

CREATE TABLE IF NOT EXISTS store_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ربط بالمتجر
    store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    
    -- بيانات المهمة
    title text NOT NULL,
    description text,
    
    -- الحالة
    status text NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'in_progress', 'waiting', 'done', 'blocked', 'canceled')),
    
    -- الأولوية
    priority text NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    
    -- نوع المهمة
    type text NOT NULL DEFAULT 'manual'
        CHECK (type IN ('template', 'manual', 'auto')),
    
    -- المستخدمين
    created_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
    assigned_to uuid REFERENCES admin_users(id) ON DELETE SET NULL,
    
    -- التواريخ
    due_date timestamptz,
    completed_at timestamptz,
    
    -- للمهام التلقائية
    auto_reason text,
    template_task_id uuid, -- ربط بالمهمة الأصلية من القالب
    
    -- التتبع
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_store_tasks_store ON store_tasks(store_id);
CREATE INDEX IF NOT EXISTS idx_store_tasks_status ON store_tasks(status);
CREATE INDEX IF NOT EXISTS idx_store_tasks_assigned ON store_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_store_tasks_created_by ON store_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_store_tasks_due_date ON store_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_store_tasks_type ON store_tasks(type);

-- تعليقات على الجدول
COMMENT ON TABLE store_tasks IS 'جدول المهام الشامل للمتاجر';
COMMENT ON COLUMN store_tasks.status IS 'حالة المهمة: pending=معلقة, in_progress=قيد التنفيذ, waiting=بانتظار, done=مكتملة, blocked=محظورة, canceled=ملغاة';
COMMENT ON COLUMN store_tasks.priority IS 'أولوية المهمة: low=منخفضة, normal=عادية, high=عالية, critical=حرجة';
COMMENT ON COLUMN store_tasks.type IS 'نوع المهمة: template=من القالب, manual=يدوية, auto=تلقائية';

-- =====================================================
-- 1.3 إنشاء جدول المشاركين Task Participants
-- =====================================================

CREATE TABLE IF NOT EXISTS task_participants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES store_tasks(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    
    -- نوع المشاركة
    role text NOT NULL DEFAULT 'helper'
        CHECK (role IN ('helper', 'reviewer', 'observer')),
    
    -- ملاحظات
    notes text,
    
    -- التتبع
    added_at timestamptz NOT NULL DEFAULT now(),
    added_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
    
    -- منع التكرار
    UNIQUE(task_id, user_id)
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_task_participants_task ON task_participants(task_id);
CREATE INDEX IF NOT EXISTS idx_task_participants_user ON task_participants(user_id);

-- تعليقات
COMMENT ON TABLE task_participants IS 'جدول المشاركين في المهام - لدعم طلب المساعدة والمشاركة';
COMMENT ON COLUMN task_participants.role IS 'دور المشارك: helper=مساعد, reviewer=مراجع, observer=مراقب';

-- =====================================================
-- Trigger لتحديث updated_at تلقائياً
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- تطبيق الـ trigger على store_tasks
DROP TRIGGER IF EXISTS update_store_tasks_updated_at ON store_tasks;
CREATE TRIGGER update_store_tasks_updated_at
    BEFORE UPDATE ON store_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security) - اختياري
-- =====================================================

-- تفعيل RLS على الجداول الجديدة
ALTER TABLE store_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_participants ENABLE ROW LEVEL SECURITY;

-- سياسة للسماح بالقراءة للجميع (المصادق عليهم)
CREATE POLICY IF NOT EXISTS "Allow authenticated read store_tasks" 
    ON store_tasks FOR SELECT 
    TO authenticated 
    USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated read task_participants" 
    ON task_participants FOR SELECT 
    TO authenticated 
    USING (true);

-- سياسة للسماح بالكتابة للجميع (المصادق عليهم) - يمكن تقييدها لاحقاً
CREATE POLICY IF NOT EXISTS "Allow authenticated write store_tasks" 
    ON store_tasks FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated write task_participants" 
    ON task_participants FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- ملخص الهيكل النهائي
-- =====================================================
/*
جدول stores (المتاجر):
  - account_manager_id (موجود) → مدير الحساب
  - media_buyer_id (موجود) → الميديا باير
  - team_leader_user_id (جديد) → قائد الفريق

جدول store_tasks (المهام):
  - id, store_id, title, description
  - status: pending | in_progress | waiting | done | blocked | canceled
  - priority: low | normal | high | critical
  - type: template | manual | auto
  - created_by, assigned_to, due_date, auto_reason
  - created_at, updated_at

جدول task_participants (المشاركين):
  - task_id, user_id (unique together)
  - role: helper | reviewer | observer
  - notes, added_at, added_by
*/
