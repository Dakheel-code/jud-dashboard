-- =====================================================
-- Migration: Phase 6 — Client Feedback على creative_requests
-- Date: 2026-02-27
-- =====================================================

-- إضافة أعمدة feedback للعميل
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'creative_requests' AND column_name = 'client_feedback'
    ) THEN
        ALTER TABLE creative_requests
            ADD COLUMN client_feedback text
                CHECK (client_feedback IN ('approved', 'revision_requested', NULL)),
            ADD COLUMN client_feedback_note text,
            ADD COLUMN client_feedback_at  timestamptz,
            ADD COLUMN result_files        jsonb DEFAULT '[]'::jsonb;

        COMMENT ON COLUMN creative_requests.client_feedback IS
            'approved = اعتمد، revision_requested = طلب تعديل';
        COMMENT ON COLUMN creative_requests.result_files IS
            'ملفات التصميم النهائية المرسلة للعميل (روابط Drive)';
    END IF;
END $$;
