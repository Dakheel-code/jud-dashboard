-- ============================================================
-- Migration 009: إصلاح أرقام الجوال التي تحتوي 96605 → 9665
-- المشكلة: 05XXXXXXXX أُضيف كـ +96605XXXXXXXX بدل +9665XXXXXXXX
-- ============================================================

-- ── إصلاح في جدول clients ────────────────────────────────────
UPDATE clients
SET phone = REGEXP_REPLACE(phone, '^\+96605', '+9665')
WHERE phone LIKE '+96605%';

-- ── إصلاح في جدول stores ─────────────────────────────────────
UPDATE stores
SET owner_phone = REGEXP_REPLACE(owner_phone, '^\+96605', '+9665')
WHERE owner_phone LIKE '+96605%';

-- ── تقرير ────────────────────────────────────────────────────
DO $$
DECLARE
  v_clients INTEGER;
  v_stores  INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_clients FROM clients WHERE phone LIKE '+96605%';
  SELECT COUNT(*) INTO v_stores  FROM stores  WHERE owner_phone LIKE '+96605%';
  RAISE NOTICE 'أرقام clients متبقية بصيغة خاطئة: %', v_clients;
  RAISE NOTICE 'أرقام stores  متبقية بصيغة خاطئة: %', v_stores;
END $$;
