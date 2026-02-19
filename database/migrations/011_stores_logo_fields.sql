-- ============================================================
-- Migration 011: إضافة حقول الشعار الثابت لجدول stores
-- ============================================================

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS logo_url          TEXT,
  ADD COLUMN IF NOT EXISTS logo_path         TEXT,
  ADD COLUMN IF NOT EXISTS logo_source_url   TEXT,
  ADD COLUMN IF NOT EXISTS logo_status       TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS logo_updated_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS logo_error        TEXT;

CREATE INDEX IF NOT EXISTS stores_logo_status_idx ON public.stores(logo_status);
