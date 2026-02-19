-- ============================================================
-- Migration 004: إضافة أعمدة مطلوبة لنظام الاستيراد
-- تُضاف على جدول stores الموجود مسبقاً
-- ============================================================

-- ── Enums جديدة (إذا لم تكن موجودة) ─────────────────────────
DO $$ BEGIN
  CREATE TYPE store_priority AS ENUM ('high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE store_status AS ENUM ('new', 'active', 'paused', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── إضافة الأعمدة المفقودة ────────────────────────────────────

-- الأولوية
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS priority store_priority NOT NULL DEFAULT 'medium';

-- الحالة (مختلفة عن is_active)
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS status store_status NOT NULL DEFAULT 'new';

-- الميزانية
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS budget NUMERIC(12, 2);

-- التصنيف
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS category TEXT;

-- رابط قروب المتجر
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS store_group_url TEXT;

-- تاريخ بداية الاشتراك
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS subscription_start_date DATE;

-- الميديا باير
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS media_buyer_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- ── فهارس للأعمدة الجديدة ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stores_priority    ON stores(priority);
CREATE INDEX IF NOT EXISTS idx_stores_status      ON stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_category    ON stores(category);
CREATE INDEX IF NOT EXISTS idx_stores_media_buyer ON stores(media_buyer_id);

-- ── فهارس للـ Dedup (مطلوبة للـ RPC) ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_stores_owner_phone ON stores(owner_phone);
CREATE INDEX IF NOT EXISTS idx_stores_owner_email ON stores(owner_email);

-- ── تحديث source_type في store_import_jobs لدعم tsv ──────────
-- (إذا كان العمود موجوداً بـ CHECK constraint قديم)
ALTER TABLE store_import_jobs
  DROP CONSTRAINT IF EXISTS store_import_jobs_source_type_check;

ALTER TABLE store_import_jobs
  ADD CONSTRAINT store_import_jobs_source_type_check
  CHECK (source_type IN ('excel', 'csv', 'tsv', 'google_sheet'));

-- ── إضافة عمود action لـ store_import_rows إذا لم يكن موجوداً ─
ALTER TABLE store_import_rows
  ADD COLUMN IF NOT EXISTS action TEXT CHECK (action IN ('insert', 'update', 'skip', 'error'));

-- ── تعليق توضيحي ─────────────────────────────────────────────
COMMENT ON COLUMN stores.priority    IS 'أولوية المتجر: high | medium | low';
COMMENT ON COLUMN stores.status      IS 'حالة المتجر: new | active | paused | expired';
COMMENT ON COLUMN stores.budget      IS 'الميزانية الشهرية بالريال';
COMMENT ON COLUMN stores.category    IS 'تصنيف أو قطاع المتجر';
COMMENT ON COLUMN stores.store_group_url IS 'رابط مجموعة واتساب أو تيليجرام';
COMMENT ON COLUMN stores.subscription_start_date IS 'تاريخ بداية الاشتراك';
COMMENT ON COLUMN stores.media_buyer_id IS 'UUID الميديا باير من admin_users';
