-- ============================================================
-- Migration 012: إنشاء Bucket store-logos في Supabase Storage
-- ============================================================

-- ── إنشاء الـ Bucket ─────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-logos',
  'store-logos',
  true,                                          -- Public (شعارات فقط)
  204800,                                        -- 200KB حد أقصى
  ARRAY['image/webp', 'image/png', 'image/jpeg', 'image/x-icon', 'image/vnd.microsoft.icon']
)
ON CONFLICT (id) DO UPDATE SET
  public           = true,
  file_size_limit  = 204800,
  allowed_mime_types = ARRAY['image/webp', 'image/png', 'image/jpeg', 'image/x-icon', 'image/vnd.microsoft.icon'];

-- ── Policies ─────────────────────────────────────────────────

-- 1. قراءة عامة بدون مصادقة
DROP POLICY IF EXISTS "store_logos_public_read" ON storage.objects;
CREATE POLICY "store_logos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'store-logos');

-- 2. رفع (INSERT) للـ service_role فقط
DROP POLICY IF EXISTS "store_logos_service_insert" ON storage.objects;
CREATE POLICY "store_logos_service_insert"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'store-logos');

-- 3. تحديث (UPDATE/UPSERT) للـ service_role — يسمح بالكتابة فوق نفس الملف
DROP POLICY IF EXISTS "store_logos_service_update" ON storage.objects;
CREATE POLICY "store_logos_service_update"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'store-logos');

-- 4. حذف للـ service_role
DROP POLICY IF EXISTS "store_logos_service_delete" ON storage.objects;
CREATE POLICY "store_logos_service_delete"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'store-logos');

-- ── تعليق توضيحي ─────────────────────────────────────────────
-- نمط التخزين الثابت:
--   المسار: store-logos/{storeId}.webp
--   مثال:   store-logos/abc123-def456.webp
--   upsert=true عند الرفع → يكتب فوق الملف القديم تلقائياً
