-- =====================================================
-- Migration: Phase 5 — حالات خاصة (بدون مصمم)
-- Date: 2026-02-27
-- =====================================================

-- =====================================================
-- 5.1 إضافة عمود flags في store_tasks (jsonb)
--     يحفظ flags مثل needs_designer_assignment
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'store_tasks' AND column_name = 'flags'
    ) THEN
        ALTER TABLE store_tasks
            ADD COLUMN flags jsonb DEFAULT '{}'::jsonb;

        COMMENT ON COLUMN store_tasks.flags IS
            'flags خاصة: needs_designer_assignment=true إذا أُنشئت المهمة بدون مصمم';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_store_tasks_flags
    ON store_tasks USING gin(flags);

-- =====================================================
-- 5.1 تحديث Function لتضيف flag عند غياب المصمم
-- =====================================================
CREATE OR REPLACE FUNCTION create_task_from_creative_request()
RETURNS TRIGGER AS $$
DECLARE
    v_account_manager_id uuid;
    v_designer_id        uuid;
    v_assignee_id        uuid;
    v_task_title         text;
    v_needs_designer     boolean := false;
    v_flags              jsonb   := '{}'::jsonb;
BEGIN
    -- منع التكرار
    IF EXISTS (
        SELECT 1 FROM store_tasks
        WHERE source_type = 'creative_request'
          AND source_id   = NEW.id
    ) THEN
        RETURN NEW;
    END IF;

    -- قراءة account_manager_id و designer_id من stores
    SELECT account_manager_id, designer_id
        INTO v_account_manager_id, v_designer_id
        FROM stores
        WHERE id = NEW.store_id;

    -- تحديد assignee_id
    IF NEW.request_type IN ('design', 'photo', 'video') THEN
        IF NEW.assigned_to IS NOT NULL THEN
            v_assignee_id := NEW.assigned_to;
        ELSIF v_designer_id IS NOT NULL THEN
            v_assignee_id := v_designer_id;
        ELSIF v_account_manager_id IS NOT NULL THEN
            v_assignee_id    := v_account_manager_id;
            v_needs_designer := true;  -- لا يوجد مصمم، استُخدم مدير الحساب
        ELSE
            v_assignee_id    := NULL;
            v_needs_designer := true;  -- لا أحد مسند
        END IF;
    ELSE
        v_assignee_id := COALESCE(NEW.assigned_to, v_account_manager_id);
    END IF;

    -- بناء flags
    IF v_needs_designer THEN
        v_flags := jsonb_build_object('needs_designer_assignment', true);
    END IF;

    -- عنوان المهمة
    v_task_title := CASE NEW.request_type
        WHEN 'design' THEN 'طلب تصميم: '
        WHEN 'video'  THEN 'طلب فيديو: '
        WHEN 'photo'  THEN 'طلب صورة: '
        WHEN 'copy'   THEN 'طلب محتوى: '
        ELSE               'طلب إبداعي: '
    END || NEW.title;

    -- إنشاء المهمة
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
        source_id,
        flags
    ) VALUES (
        NEW.store_id,
        v_task_title,
        NEW.description,
        'open',
        'normal',
        'auto',
        'أُنشئت تلقائياً من ' || v_task_title,
        v_assignee_id,
        NEW.requested_by,
        NEW.due_date,
        NEW.id,
        'creative_request',
        NEW.id,
        v_flags
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger يبقى كما هو (AFTER INSERT)
DROP TRIGGER IF EXISTS trg_creative_request_auto_task ON creative_requests;
CREATE TRIGGER trg_creative_request_auto_task
    AFTER INSERT ON creative_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_task_from_creative_request();

-- =====================================================
-- 5.2 Function: reassign_design_tasks(store_id, new_designer_id)
--     تُعيد إسناد مهام التصميم المفتوحة للمصمم الجديد
-- =====================================================
CREATE OR REPLACE FUNCTION reassign_design_tasks(
    p_store_id    uuid,
    p_designer_id uuid
)
RETURNS int AS $$
DECLARE
    v_count int;
BEGIN
    UPDATE store_tasks
        SET assigned_to = p_designer_id,
            flags       = flags - 'needs_designer_assignment',
            updated_at  = now()
    WHERE store_id   = p_store_id
      AND source_type = 'creative_request'
      AND status      NOT IN ('done', 'canceled')
      AND (
            assigned_to IS NULL
            OR (flags->>'needs_designer_assignment')::boolean = true
          );

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Notes
-- =====================================================
-- flags->>'needs_designer_assignment' = 'true'
-- → يعني المهمة أُنشئت بدون مصمم مسند
-- reassign_design_tasks(store_id, designer_id)
-- → تُحدّث كل مهام التصميم المفتوحة بدون مصمم
