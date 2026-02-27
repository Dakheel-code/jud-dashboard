-- =====================================================
-- Migration: Phase 2 — create_task_from_creative_request()
-- Date: 2026-02-27
-- يُحدّث الـ Trigger بمواصفات Phase 2 الكاملة
-- =====================================================

-- =====================================================
-- 2.0 إضافة 'open' إلى CHECK constraint في store_tasks
-- =====================================================
ALTER TABLE store_tasks
    DROP CONSTRAINT IF EXISTS store_tasks_status_check;

ALTER TABLE store_tasks
    ADD CONSTRAINT store_tasks_status_check
    CHECK (status IN ('open', 'pending', 'in_progress', 'waiting', 'done', 'blocked', 'canceled'));

-- تحديث الـ DEFAULT ليكون 'open' (الحالة الابتدائية للمهام التلقائية)
-- ملاحظة: نُبقي 'pending' default للمهام اليدوية
-- لا نغيّر الـ DEFAULT لتجنب تأثير المهام الموجودة

-- =====================================================
-- 2.1 + 2.2 + 2.3 — Function + Trigger + UNIQUE
-- =====================================================

CREATE OR REPLACE FUNCTION create_task_from_creative_request()
RETURNS TRIGGER AS $$
DECLARE
    v_account_manager_id uuid;
    v_designer_id        uuid;
    v_assignee_id        uuid;
    v_task_title         text;
BEGIN
    -- 2.3 منع التكرار: هل توجد مهمة بنفس الطلب؟
    -- (UNIQUE index على source_type, source_id يتكفّل بذلك تلقائياً)
    -- لكن نتحقق يدوياً لإرجاع رسالة واضحة بدل خطأ DB
    IF EXISTS (
        SELECT 1 FROM store_tasks
        WHERE source_type = 'creative_request'
          AND source_id   = NEW.id
    ) THEN
        RETURN NEW; -- مهمة موجودة — لا تكرار
    END IF;

    -- 2.1 قراءة account_manager_id و designer_id من stores
    SELECT account_manager_id, designer_id
        INTO v_account_manager_id, v_designer_id
        FROM stores
        WHERE id = NEW.store_id;

    -- 2.1 تحديد assignee_id حسب نوع الطلب
    IF NEW.request_type IN ('design', 'photo', 'video') THEN
        -- تصميم → المصمم أولاً، وإلا مدير الحساب
        v_assignee_id := COALESCE(NEW.assigned_to, v_designer_id, v_account_manager_id);
    ELSE
        -- محتوى (copy/other) → مدير الحساب
        v_assignee_id := COALESCE(NEW.assigned_to, v_account_manager_id);
    END IF;

    -- 2.1 عنوان المهمة
    v_task_title := CASE NEW.request_type
        WHEN 'design' THEN 'طلب تصميم: '
        WHEN 'video'  THEN 'طلب فيديو: '
        WHEN 'photo'  THEN 'طلب صورة: '
        WHEN 'copy'   THEN 'طلب محتوى: '
        ELSE               'طلب إبداعي: '
    END || NEW.title;

    -- 2.1 إنشاء المهمة
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
        'open',        -- 2.1: status = open
        'normal',      -- 2.1: priority = متوسط
        'auto',
        'أُنشئت تلقائياً من ' || v_task_title,
        v_assignee_id,
        NEW.requested_by,
        NEW.due_date,
        NEW.id,
        'creative_request',
        NEW.id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2.2 Trigger: AFTER INSERT ON creative_requests
-- =====================================================
DROP TRIGGER IF EXISTS trg_creative_request_auto_task ON creative_requests;

CREATE TRIGGER trg_creative_request_auto_task
    AFTER INSERT
    ON creative_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_task_from_creative_request();

-- =====================================================
-- ملخص Phase 2
-- =====================================================
-- create_task_from_creative_request():
--   ✓ تقرأ account_manager_id و designer_id من stores
--   ✓ design/photo/video → designer_id (أو account_manager_id إذا لا مصمم)
--   ✓ copy/other         → account_manager_id
--   ✓ title: "طلب تصميم: X" أو "طلب محتوى: X"
--   ✓ priority: normal (متوسط)
--   ✓ status: open
--   ✓ source_type='creative_request', source_id=NEW.id
--   ✓ UNIQUE(source_type, source_id) → أي تكرار يفشل تلقائياً
