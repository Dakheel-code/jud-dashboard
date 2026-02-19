-- ============================================================
-- Migration 007: توحيد صيغة الجوال السعودي + دمج العملاء المكررين
-- الصيغة الموحّدة: +966XXXXXXXXX
-- ============================================================

-- ── دالة مساعدة: تحويل أي صيغة جوال → +966XXXXXXXXX ─────────
CREATE OR REPLACE FUNCTION normalize_sa_phone(raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  digits TEXT;
BEGIN
  IF raw IS NULL OR TRIM(raw) = '' THEN RETURN NULL; END IF;

  -- إزالة كل شيء عدا الأرقام
  digits := REGEXP_REPLACE(raw, '[^0-9]', '', 'g');

  IF digits = '' THEN RETURN NULL; END IF;

  -- إزالة 00 من البداية
  IF digits LIKE '00%' THEN digits := SUBSTRING(digits FROM 3); END IF;

  -- يبدأ بـ 966 → أضف +
  IF digits LIKE '966%' THEN RETURN '+' || digits; END IF;

  -- يبدأ بـ 05 → +96605...
  IF digits LIKE '05%' THEN RETURN '+966' || digits; END IF;

  -- يبدأ بـ 5 → +9665...
  IF digits LIKE '5%' THEN RETURN '+966' || digits; END IF;

  -- غير ذلك → أضف + فقط
  RETURN '+' || digits;
END;
$$;

-- ── 1. توحيد owner_phone في جدول stores ──────────────────────
UPDATE stores
SET owner_phone = normalize_sa_phone(owner_phone)
WHERE owner_phone IS NOT NULL AND owner_phone <> '';

-- ── 2. توحيد phone في جدول clients ───────────────────────────
UPDATE clients
SET phone = normalize_sa_phone(phone)
WHERE phone IS NOT NULL AND phone <> '';

-- ── 3. دمج العملاء المكررين (نفس الجوال بعد التوحيد) ─────────
-- نحتفظ بأقدم عميل ونحوّل المتاجر المرتبطة بالأحدث إليه
DO $$
DECLARE
  rec         RECORD;
  keep_id     UUID;
  dup_id      UUID;
  merged_count INTEGER := 0;
BEGIN
  -- جلب كل الجوالات المكررة
  FOR rec IN
    SELECT phone, MIN(created_at) AS oldest_at, COUNT(*) AS cnt
    FROM clients
    WHERE phone IS NOT NULL AND phone <> ''
    GROUP BY phone
    HAVING COUNT(*) > 1
  LOOP
    -- العميل الأقدم = نحتفظ به
    SELECT id INTO keep_id
    FROM clients
    WHERE phone = rec.phone
    ORDER BY created_at ASC
    LIMIT 1;

    -- باقي العملاء = نحذفهم بعد نقل متاجرهم
    FOR dup_id IN
      SELECT id FROM clients
      WHERE phone = rec.phone AND id <> keep_id
    LOOP
      -- نقل المتاجر المرتبطة بالعميل المكرر إلى العميل الأصلي
      UPDATE stores SET client_id = keep_id WHERE client_id = dup_id;

      -- تحديث اسم العميل الأصلي إذا كان فارغاً
      UPDATE clients c
      SET
        name  = COALESCE(NULLIF(c.name, c.phone), (SELECT name FROM clients WHERE id = dup_id)),
        email = COALESCE(c.email, (SELECT email FROM clients WHERE id = dup_id))
      WHERE c.id = keep_id;

      -- حذف العميل المكرر
      DELETE FROM clients WHERE id = dup_id;

      merged_count := merged_count + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'عدد العملاء المكررين الذين تم دمجهم: %', merged_count;
END $$;

-- ── 4. إصلاح أسماء العملاء من stores (إذا كانت مكسورة) ───────
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
    c.name = c.phone
    OR c.name LIKE '%Ù%'
    OR c.name LIKE '%Ø%'
    OR c.name LIKE '%Ã%'
  );

-- ── 5. تقرير نهائي ───────────────────────────────────────────
DO $$
DECLARE
  v_clients  INTEGER;
  v_linked   INTEGER;
  v_unlinked INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_clients  FROM clients;
  SELECT COUNT(*) INTO v_linked   FROM stores WHERE client_id IS NOT NULL;
  SELECT COUNT(*) INTO v_unlinked FROM stores WHERE client_id IS NULL;

  RAISE NOTICE '=== تقرير نهائي ===';
  RAISE NOTICE 'إجمالي العملاء بعد الدمج:     %', v_clients;
  RAISE NOTICE 'متاجر مرتبطة بعميل:           %', v_linked;
  RAISE NOTICE 'متاجر غير مرتبطة (بدون جوال): %', v_unlinked;
END $$;

-- ── تنظيف الدالة المساعدة ─────────────────────────────────────
DROP FUNCTION IF EXISTS normalize_sa_phone(TEXT);
