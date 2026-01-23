-- إصلاح جدول task_activity_log
-- إضافة عمود details إذا لم يكن موجوداً

-- التحقق من وجود العمود وإضافته إذا لم يكن موجوداً
DO $$ 
BEGIN
    -- إضافة عمود details إذا لم يكن موجوداً
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_activity_log' AND column_name = 'details'
    ) THEN
        ALTER TABLE task_activity_log ADD COLUMN details JSONB DEFAULT '{}';
    END IF;

    -- إذا كان هناك عمود meta، نسخ البيانات منه إلى details
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_activity_log' AND column_name = 'meta'
    ) THEN
        UPDATE task_activity_log SET details = meta WHERE details IS NULL OR details = '{}';
    END IF;
END $$;

-- التأكد من أن الجدول يحتوي على جميع الأعمدة المطلوبة
-- إذا لم يكن الجدول موجوداً، أنشئه
CREATE TABLE IF NOT EXISTS task_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES store_tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_task_activity_log_task_id ON task_activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_log_created_at ON task_activity_log(created_at DESC);
