-- ============================================================
-- Migration 010: إصلاح أسماء المتاجر الفارغة + أسماء الملاك المكسورة
-- ============================================================

-- ── 1. إصلاح store_name الفارغ من store_url ──────────────────
-- يستخرج اسم الدومين ويحوّله لاسم قابل للقراءة
-- مثال: almahadesigns.com → Almahadesigns
UPDATE stores
SET store_name = INITCAP(
  REGEXP_REPLACE(
    REGEXP_REPLACE(store_url, '\.[a-z]{2,}(/.*)?$', ''),  -- حذف الامتداد
    '[^a-zA-Z0-9]', ' ', 'g'                              -- تحويل الرموز لمسافات
  )
)
WHERE
  (store_name IS NULL OR TRIM(store_name) = '')
  AND store_url IS NOT NULL
  AND TRIM(store_url) <> '';

-- ── 2. إصلاح owner_name المكسور من جدول clients ──────────────
-- يستبدل الاسم المكسور بالاسم الصحيح من clients المرتبط
UPDATE stores s
SET owner_name = c.name
FROM clients c
WHERE
  s.client_id = c.id
  AND c.name IS NOT NULL
  AND TRIM(c.name) <> ''
  AND c.name <> c.phone  -- ليس رقم جوال احتياطي
  AND (
    s.owner_name IS NULL
    OR TRIM(s.owner_name) = ''
    OR s.owner_name LIKE '%Ù%'
    OR s.owner_name LIKE '%Ø%'
    OR s.owner_name LIKE '%Ã%'
    OR s.owner_name ~ '^[^ء-ي a-zA-Z]+$'  -- لا يحتوي حروف عربية أو إنجليزية
  );

-- ── 3. تقرير ─────────────────────────────────────────────────
DO $$
DECLARE
  v_no_name   INTEGER;
  v_broken    INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_no_name FROM stores WHERE store_name IS NULL OR TRIM(store_name) = '';
  SELECT COUNT(*) INTO v_broken  FROM stores WHERE owner_name LIKE '%Ù%' OR owner_name LIKE '%Ø%';
  RAISE NOTICE 'متاجر بدون اسم متبقية:         %', v_no_name;
  RAISE NOTICE 'متاجر بأسماء ملاك مكسورة:      %', v_broken;
END $$;
