-- ============================================================
-- Migration: Store Import Jobs & Rows
-- ============================================================

-- حالات وظيفة الاستيراد
-- uploaded   → تم رفع الملف
-- parsed     → تم تحليل الملف وتحويله لصفوف
-- validated  → تم التحقق من الصفوف (مع أخطاء/تحذيرات)
-- committed  → تم الحفظ الفعلي في قاعدة البيانات
-- failed     → فشل في مرحلة ما

CREATE TYPE import_job_status AS ENUM (
  'uploaded',
  'parsed',
  'validated',
  'committed',
  'failed'
);

-- حالة كل صف
CREATE TYPE import_row_status AS ENUM (
  'pending',    -- لم يُعالج بعد
  'valid',      -- صالح بدون أخطاء
  'warning',    -- صالح مع تحذيرات (تم تصحيح تلقائي)
  'error',      -- خطأ يمنع الحفظ
  'committed',  -- تم حفظه
  'skipped'     -- تم تجاهله (مكرر أو محذوف يدوياً)
);

-- ============================================================
-- جدول وظائف الاستيراد
-- ============================================================
CREATE TABLE IF NOT EXISTS store_import_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by      UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- مصدر البيانات
  source_type     TEXT NOT NULL CHECK (source_type IN ('excel', 'csv', 'google_sheet')),
  source_name     TEXT,                        -- اسم الملف أو رابط الشيت
  source_url      TEXT,                        -- رابط Google Sheet إن وجد

  -- حالة الوظيفة
  status          import_job_status NOT NULL DEFAULT 'uploaded',
  error_message   TEXT,                        -- رسالة الخطأ إن فشلت

  -- إحصائيات
  total_rows      INTEGER NOT NULL DEFAULT 0,
  valid_rows      INTEGER NOT NULL DEFAULT 0,
  warning_rows    INTEGER NOT NULL DEFAULT 0,
  error_rows      INTEGER NOT NULL DEFAULT 0,
  committed_rows  INTEGER NOT NULL DEFAULT 0,
  skipped_rows    INTEGER NOT NULL DEFAULT 0,

  -- توقيت المراحل
  parsed_at       TIMESTAMPTZ,
  validated_at    TIMESTAMPTZ,
  committed_at    TIMESTAMPTZ
);

-- ============================================================
-- جدول صفوف الاستيراد
-- ============================================================
CREATE TABLE IF NOT EXISTS store_import_rows (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID NOT NULL REFERENCES store_import_jobs(id) ON DELETE CASCADE,
  row_index       INTEGER NOT NULL,            -- رقم الصف في الملف الأصلي (1-based)

  -- البيانات الخام والمطبّعة
  raw_row         JSONB NOT NULL,              -- الصف كما جاء من الملف
  normalized_row  JSONB,                       -- الصف بعد التطبيع والتصحيح

  -- نتائج التحقق
  status          import_row_status NOT NULL DEFAULT 'pending',
  errors          JSONB NOT NULL DEFAULT '[]', -- [{ field, message, value }]
  warnings        JSONB NOT NULL DEFAULT '[]', -- [{ field, message, old_value, new_value }]
  autofixes       JSONB NOT NULL DEFAULT '[]', -- [{ field, action, old_value, new_value }]

  -- نتيجة الحفظ
  store_id        UUID REFERENCES stores(id) ON DELETE SET NULL,
  action          TEXT CHECK (action IN ('insert', 'update', 'skip')),
  committed_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- فهارس
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_by  ON store_import_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status      ON store_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at  ON store_import_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_import_rows_job_id      ON store_import_rows(job_id);
CREATE INDEX IF NOT EXISTS idx_import_rows_status      ON store_import_rows(status);
CREATE INDEX IF NOT EXISTS idx_import_rows_job_status  ON store_import_rows(job_id, status);
CREATE INDEX IF NOT EXISTS idx_import_rows_store_id    ON store_import_rows(store_id);

-- ============================================================
-- Trigger: updated_at تلقائي
-- ============================================================
CREATE OR REPLACE FUNCTION update_import_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_import_jobs_updated_at
  BEFORE UPDATE ON store_import_jobs
  FOR EACH ROW EXECUTE FUNCTION update_import_job_updated_at();

-- ============================================================
-- RLS (Row Level Security) — Admin Only
-- ============================================================
ALTER TABLE store_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_import_rows ENABLE ROW LEVEL SECURITY;

-- السماح للـ service role بكل العمليات
CREATE POLICY "service_role_all_import_jobs"
  ON store_import_jobs FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_import_rows"
  ON store_import_rows FOR ALL
  TO service_role USING (true) WITH CHECK (true);
