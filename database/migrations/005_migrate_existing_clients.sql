-- ============================================================
-- Migration 005: نقل عملاء المتاجر الحالية إلى جدول clients
-- المنطق:
--   1. لكل متجر له owner_phone → ابحث عن عميل بنفس الجوال
--   2. إذا لم يوجد → أنشئ عميلاً جديداً
--   3. اربط المتجر بالعميل عبر client_id
--   4. المعرّف الفعلي للعميل = رقم الجوال (phone UNIQUE)
-- ============================================================

-- ── 0. تأكد من وجود UNIQUE على phone في clients ───────────────
-- (يمنع التكرار عند التشغيل المتعدد)
DO $$ BEGIN
  ALTER TABLE clients ADD CONSTRAINT clients_phone_unique UNIQUE (phone);
EXCEPTION WHEN duplicate_table THEN NULL;
           WHEN duplicate_object THEN NULL;
END $$;

-- ── 1. إدراج العملاء الجدد من المتاجر ────────────────────────
-- يُدرج فقط المتاجر التي لها owner_phone ولا يوجد عميل بنفس الجوال
INSERT INTO clients (name, phone, email, created_at, updated_at)
SELECT DISTINCT ON (owner_phone)
  COALESCE(NULLIF(TRIM(owner_name), ''), owner_phone),
  owner_phone,
  NULLIF(TRIM(owner_email), ''),
  NOW(),
  NOW()
FROM stores
WHERE
  owner_phone IS NOT NULL
  AND owner_phone <> ''
  AND NOT EXISTS (
    SELECT 1 FROM clients c WHERE c.phone = stores.owner_phone
  )
ORDER BY owner_phone, created_at ASC;

-- ── 2. ربط المتاجر بالعملاء عبر client_id ────────────────────
-- يُحدّث كل متجر له owner_phone بـ client_id المقابل
UPDATE stores s
SET client_id = c.id
FROM clients c
WHERE
  s.owner_phone IS NOT NULL
  AND s.owner_phone <> ''
  AND c.phone = s.owner_phone
  AND s.client_id IS NULL;  -- لا تُعيد ربط المتاجر المرتبطة مسبقاً

-- ── 3. تقرير النتيجة ──────────────────────────────────────────
DO $$
DECLARE
  v_clients_created  INTEGER;
  v_stores_linked    INTEGER;
  v_stores_no_phone  INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_clients_created FROM clients;
  SELECT COUNT(*) INTO v_stores_linked   FROM stores WHERE client_id IS NOT NULL;
  SELECT COUNT(*) INTO v_stores_no_phone FROM stores WHERE owner_phone IS NULL OR owner_phone = '';

  RAISE NOTICE '=== نتيجة نقل العملاء ===';
  RAISE NOTICE 'إجمالي العملاء في جدول clients: %', v_clients_created;
  RAISE NOTICE 'متاجر مرتبطة بعميل:             %', v_stores_linked;
  RAISE NOTICE 'متاجر بدون رقم جوال (لم تُنقل): %', v_stores_no_phone;
END $$;
