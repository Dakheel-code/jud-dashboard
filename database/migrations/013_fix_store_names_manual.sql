-- ============================================================
-- Migration 013: تصحيح أسماء المتاجر يدوياً
-- ============================================================

UPDATE stores SET store_name = 'نبراس'            WHERE store_url LIKE '%neppras%'           AND (store_name IS NULL OR store_name = '' OR store_name = 'Neppras');
UPDATE stores SET store_name = 'الماها ديزاينز'   WHERE store_url LIKE '%almahadesigns%'      AND (store_name IS NULL OR store_name = '' OR store_name ILIKE '%almahadesigns%');
UPDATE stores SET store_name = 'نيو ويل'          WHERE store_url LIKE '%newwellksa%'         AND (store_name IS NULL OR store_name = '' OR store_name ILIKE '%newwellksa%');
UPDATE stores SET store_name = 'أناناس روستري'    WHERE store_url LIKE '%ananasroastery%'     AND (store_name IS NULL OR store_name = '' OR store_name ILIKE '%ananasroastery%');
UPDATE stores SET store_name = 'ذيب كارتونز'      WHERE store_url LIKE '%theebcartons%'       AND (store_name IS NULL OR store_name = '' OR store_name ILIKE '%theebcartons%');
UPDATE stores SET store_name = 'رفيا عباية'       WHERE store_url LIKE '%rofiabaya%'          AND (store_name IS NULL OR store_name = '' OR store_name ILIKE '%rofiabaya%');
UPDATE stores SET store_name = 'كناز بيوتي'       WHERE store_url LIKE '%kenazbeauty%'        AND (store_name IS NULL OR store_name = '' OR store_name ILIKE '%kenazbeauty%');

-- تقرير
DO $$
DECLARE v_empty INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_empty FROM stores WHERE store_name IS NULL OR TRIM(store_name) = '';
  RAISE NOTICE 'متاجر بدون اسم متبقية: %', v_empty;
END $$;
