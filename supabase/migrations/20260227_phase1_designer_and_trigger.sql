-- =====================================================
-- Migration: Phase 1 — Designer + Task Auto-Creation Trigger
-- Date: 2026-02-27
-- =====================================================

-- =====================================================
-- 1.1 إضافة designer_id في جدول stores
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stores' AND column_name = 'designer_id'
    ) THEN
        ALTER TABLE stores
            ADD COLUMN designer_id uuid REFERENCES admin_users(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_stores_designer ON stores(designer_id);

        COMMENT ON COLUMN stores.designer_id IS
            'المصمم المسؤول عن المتجر — يُسند إليه تلقائياً طلبات التصميم';
    END IF;
END $$;

-- =====================================================
-- 1.2 إضافة source_type + source_id في store_tasks
--     + UNIQUE index لمنع تكرار مهمة لنفس الطلب
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'store_tasks' AND column_name = 'source_type'
    ) THEN
        ALTER TABLE store_tasks ADD COLUMN source_type text;
        COMMENT ON COLUMN store_tasks.source_type IS
            'نوع المصدر الذي أنشأ المهمة: creative_request | ...';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'store_tasks' AND column_name = 'source_id'
    ) THEN
        ALTER TABLE store_tasks ADD COLUMN source_id uuid;
        COMMENT ON COLUMN store_tasks.source_id IS
            'معرّف المصدر (مثلاً creative_requests.id) — مع source_type يمنع التكرار';
    END IF;
END $$;

-- UNIQUE index (يُنشأ مرة واحدة)
CREATE UNIQUE INDEX IF NOT EXISTS tasks_source_unique
    ON store_tasks(source_type, source_id)
    WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

-- =====================================================
-- 1.3 DB Trigger — إنشاء المهمة تلقائياً عند إضافة
--     creative_request بحالة new أو waiting_info
-- =====================================================

CREATE OR REPLACE FUNCTION fn_creative_request_auto_task()
RETURNS TRIGGER AS $$
DECLARE
    v_assignee      uuid;
    v_task_title    text;
    v_task_priority text;
    v_existing_task uuid;
BEGIN
    -- فقط عند الإدراج أو تغيير الحالة إلى new/waiting_info
    IF (TG_OP = 'INSERT' AND NEW.status NOT IN ('new', 'waiting_info')) THEN
        RETURN NEW;
    END IF;

    IF (TG_OP = 'UPDATE') THEN
        -- نُشغّل فقط إذا تغيّرت الحالة إلى new/waiting_info من حالة أخرى
        IF NOT (NEW.status IN ('new', 'waiting_info') AND OLD.status NOT IN ('new', 'waiting_info')) THEN
            RETURN NEW;
        END IF;
    END IF;

    -- تحقق: هل توجد مهمة مرتبطة بهذا الطلب مسبقاً؟
    SELECT id INTO v_existing_task
        FROM store_tasks
        WHERE source_type = 'creative_request'
          AND source_id   = NEW.id
        LIMIT 1;

    IF v_existing_task IS NOT NULL THEN
        RETURN NEW; -- موجودة — لا تكرار
    END IF;

    -- تحديد المُسند إليه حسب نوع الطلب
    IF NEW.request_type IN ('design', 'photo', 'video') THEN
        -- المصمم من جدول stores
        SELECT designer_id INTO v_assignee
            FROM stores WHERE id = NEW.store_id;
    ELSE
        -- المحتوى (copy/other) → مدير الحساب
        SELECT account_manager_id INTO v_assignee
            FROM stores WHERE id = NEW.store_id;
    END IF;

    -- عنوان المهمة
    v_task_title := CASE NEW.request_type
        WHEN 'design' THEN '[تصميم] '
        WHEN 'video'  THEN '[فيديو] '
        WHEN 'photo'  THEN '[صورة] '
        WHEN 'copy'   THEN '[محتوى] '
        ELSE                '[طلب] '
    END || NEW.title;

    -- أولوية المهمة (تحويل من أولوية الطلب)
    v_task_priority := CASE NEW.priority
        WHEN 'urgent' THEN 'critical'
        WHEN 'high'   THEN 'high'
        WHEN 'low'    THEN 'low'
        ELSE               'normal'
    END;

    -- إدراج المهمة
    INSERT INTO store_tasks (
        store_id,
        title,
        description,
        status,
        priority,
        type,
        auto_reason,
        assigned_to,
        created_by,
        due_date,
        source_request_id,
        source_type,
        source_id
    ) VALUES (
        NEW.store_id,
        v_task_title,
        NEW.description,
        'pending',
        v_task_priority,
        'auto',
        'أُنشئت تلقائياً من طلب ' || NEW.request_type || ' #' || LEFT(NEW.id::text, 8),
        COALESCE(NEW.assigned_to, v_assignee),  -- المُسند في الطلب أولاً، ثم المصمم/المدير
        NEW.requested_by,
        NEW.due_date,
        NEW.id,         -- source_request_id (الحقل القديم من Phase 0)
        'creative_request',
        NEW.id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق الـ Trigger
DROP TRIGGER IF EXISTS trg_creative_request_auto_task ON creative_requests;
CREATE TRIGGER trg_creative_request_auto_task
    AFTER INSERT OR UPDATE OF status
    ON creative_requests
    FOR EACH ROW
    EXECUTE FUNCTION fn_creative_request_auto_task();

-- =====================================================
-- ملاحظات
-- =====================================================
-- النتيجة:
--   creative_request (new/waiting_info) ──► store_task (pending)
--   design/photo/video  → assigned_to = stores.designer_id
--   copy/other          → assigned_to = stores.account_manager_id
--   إذا لا مصمم مُسند  → assigned_to = NULL (مهمة غير مسندة)
--   UNIQUE(source_type, source_id) يمنع إنشاء مهمتين لنفس الطلب
