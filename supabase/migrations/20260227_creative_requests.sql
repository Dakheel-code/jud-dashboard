-- =====================================================
-- Migration: Creative Requests (طلبات التصاميم/المحتوى)
-- Date: 2026-02-27
-- Phase 0: قاعدة القرار
-- =====================================================

-- =====================================================
-- 1. إنشاء جدول creative_requests
-- =====================================================
CREATE TABLE IF NOT EXISTS creative_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ربط بالمتجر
    store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

    -- نوع الطلب
    request_type text NOT NULL DEFAULT 'design'
        CHECK (request_type IN ('design', 'video', 'copy', 'photo', 'other')),

    -- عنوان ووصف الطلب
    title text NOT NULL,
    description text,

    -- الحالة
    status text NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'waiting_info', 'in_progress', 'review', 'done', 'rejected', 'canceled')),

    -- الأولوية
    priority text NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- منصة الإعلان المستهدفة
    platform text,

    -- المرفقات (روابط أو مسارات)
    attachments jsonb DEFAULT '[]'::jsonb,

    -- ملاحظات إضافية
    notes text,

    -- من أنشأ الطلب (التاجر أو الموظف)
    requested_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,

    -- من يعمل على الطلب (المصمم)
    assigned_to uuid REFERENCES admin_users(id) ON DELETE SET NULL,

    -- تاريخ التسليم المطلوب
    due_date timestamptz,

    -- تاريخ الإنجاز الفعلي
    completed_at timestamptz,

    -- التتبع
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- فهارس
CREATE INDEX IF NOT EXISTS idx_creative_requests_store    ON creative_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_creative_requests_status   ON creative_requests(status);
CREATE INDEX IF NOT EXISTS idx_creative_requests_assigned ON creative_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_creative_requests_type     ON creative_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_creative_requests_created  ON creative_requests(created_at DESC);

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_creative_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_creative_requests_updated_at ON creative_requests;
CREATE TRIGGER trg_creative_requests_updated_at
    BEFORE UPDATE ON creative_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_creative_requests_updated_at();

-- RLS
ALTER TABLE creative_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_creative_requests" ON creative_requests;
CREATE POLICY "allow_all_creative_requests"
    ON creative_requests FOR ALL
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- 2. إضافة source_request_id في store_tasks
--    (ربط المهمة بالطلب الذي أنشأها — منع التكرار)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'store_tasks' AND column_name = 'source_request_id'
    ) THEN
        ALTER TABLE store_tasks
            ADD COLUMN source_request_id uuid REFERENCES creative_requests(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_store_tasks_source_request
            ON store_tasks(source_request_id);

        COMMENT ON COLUMN store_tasks.source_request_id IS
            'ربط المهمة بطلب creative_request الذي أنشأها — يمنع إنشاء مهمة مكررة لنفس الطلب';
    END IF;
END $$;
