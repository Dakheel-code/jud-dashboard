-- ============================================================
-- Migration 006: إصلاح أسماء العملاء المكسورة (encoding)
-- المصدر الصحيح = owner_name من جدول stores
-- ============================================================

-- ── تحديث اسم العميل من المتجر المرتبط به ────────────────────
-- يُحدّث فقط إذا كان الاسم الحالي يبدو مكسوراً (يحتوي أحرف غير عربية/إنجليزية)
-- أو إذا كان الاسم = رقم الجوال (وُضع كاحتياطي في migration 005)
UPDATE clients c
SET
  name       = COALESCE(NULLIF(TRIM(s.owner_name), ''), c.name),
  email      = COALESCE(c.email, NULLIF(TRIM(s.owner_email), '')),
  updated_at = NOW()
FROM stores s
WHERE
  s.client_id = c.id
  AND s.owner_name IS NOT NULL
  AND TRIM(s.owner_name) <> ''
  AND (
    -- الاسم = رقم الجوال (احتياطي من migration 005)
    c.name = c.phone
    -- أو الاسم يحتوي أحرف مكسورة (Ù Ø ÿ وما شابه)
    OR c.name LIKE '%Ù%'
    OR c.name LIKE '%Ø%'
    OR c.name LIKE '%Ã%'
    OR c.name LIKE '%ÿ%'
    OR c.name ~ '[^\u0000-\u007F\u0600-\u06FF\u0750-\u077F ]'
  );

-- ── تقرير ────────────────────────────────────────────────────
DO $$
DECLARE v_fixed INTEGER;
BEGIN
  GET DIAGNOSTICS v_fixed = ROW_COUNT;
  RAISE NOTICE 'عدد الأسماء التي تم إصلاحها: %', v_fixed;
END $$;
