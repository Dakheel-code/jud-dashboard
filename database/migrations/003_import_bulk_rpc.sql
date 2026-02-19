-- ============================================================
-- Migration 003: import_stores_bulk RPC
-- Bulk upsert stores with per-row result tracking
-- ============================================================

-- ── نوع النتيجة لكل صف ───────────────────────────────────────
CREATE TYPE import_row_result AS (
  row_index     int,
  store_id      uuid,
  action        text,   -- 'insert' | 'update' | 'skip'
  matched_by    text,   -- 'store_url' | 'owner_phone' | 'owner_email' | null
  error_message text
);

-- ── الدالة الرئيسية ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION import_stores_bulk(p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- تعمل بصلاحيات المالك (service role)
SET search_path = public
AS $$
DECLARE
  v_row          jsonb;
  v_row_index    int;
  v_store_id     uuid;
  v_action       text;
  v_matched_by   text;
  v_error        text;
  v_store_url    text;
  v_owner_phone  text;
  v_owner_email  text;
  v_existing_id  uuid;
  v_results      jsonb := '[]'::jsonb;
  v_inserted     int   := 0;
  v_updated      int   := 0;
  v_skipped      int   := 0;
  v_errors       int   := 0;
  v_store_data   jsonb;
BEGIN
  -- التحقق من أن المدخل مصفوفة
  IF jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_rows must be a JSON array';
  END IF;

  -- معالجة كل صف
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_row_index   := (v_row->>'row_index')::int;
    v_store_url   := v_row->>'store_url';
    v_owner_phone := v_row->>'owner_phone';
    v_owner_email := v_row->>'owner_email';
    v_store_id    := NULL;
    v_action      := 'insert';
    v_matched_by  := NULL;
    v_error       := NULL;
    v_existing_id := NULL;

    BEGIN
      -- ── كشف التكرار (Dedup) بالأولوية ──────────────────────
      -- 1. store_url
      IF v_store_url IS NOT NULL AND v_store_url <> '' THEN
        SELECT id INTO v_existing_id
        FROM stores
        WHERE store_url = v_store_url
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
          v_matched_by := 'store_url';
        END IF;
      END IF;

      -- 2. owner_phone (إذا لم يُوجد تطابق بالرابط)
      IF v_existing_id IS NULL AND v_owner_phone IS NOT NULL AND v_owner_phone <> '' THEN
        SELECT id INTO v_existing_id
        FROM stores
        WHERE owner_phone = v_owner_phone
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
          v_matched_by := 'owner_phone';
        END IF;
      END IF;

      -- 3. owner_email (إذا لم يُوجد تطابق سابق)
      IF v_existing_id IS NULL AND v_owner_email IS NOT NULL AND v_owner_email <> '' THEN
        SELECT id INTO v_existing_id
        FROM stores
        WHERE owner_email = v_owner_email
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
          v_matched_by := 'owner_email';
        END IF;
      END IF;

      -- ── بناء بيانات المتجر (تجاهل الحقول الفارغة عند التحديث) ──
      v_store_data := jsonb_strip_nulls(jsonb_build_object(
        'store_url',               NULLIF(v_row->>'store_url', ''),
        'store_name',              NULLIF(v_row->>'store_name', ''),
        'owner_name',              NULLIF(v_row->>'owner_name', ''),
        'owner_phone',             NULLIF(v_row->>'owner_phone', ''),
        'owner_email',             NULLIF(v_row->>'owner_email', ''),
        'priority',                NULLIF(v_row->>'priority', ''),
        'status',                  NULLIF(v_row->>'status', ''),
        'budget',                  CASE WHEN v_row->>'budget' IS NOT NULL AND v_row->>'budget' <> ''
                                        THEN (v_row->>'budget')::numeric ELSE NULL END,
        'category',                NULLIF(v_row->>'category', ''),
        'store_group_url',         NULLIF(v_row->>'store_group_url', ''),
        'subscription_start_date', NULLIF(v_row->>'subscription_start_date', ''),
        'account_manager_id',      NULLIF(v_row->>'account_manager_id', ''),
        'media_buyer_id',          NULLIF(v_row->>'media_buyer_id', ''),
        'notes',                   NULLIF(v_row->>'notes', '')
      ));

      IF v_existing_id IS NOT NULL THEN
        -- ── UPDATE ──────────────────────────────────────────────
        UPDATE stores SET
          store_url               = COALESCE(v_store_data->>'store_url',               store_url),
          store_name              = COALESCE(v_store_data->>'store_name',              store_name),
          owner_name              = COALESCE(v_store_data->>'owner_name',              owner_name),
          owner_phone             = COALESCE(v_store_data->>'owner_phone',             owner_phone),
          owner_email             = COALESCE(v_store_data->>'owner_email',             owner_email),
          priority                = COALESCE((v_store_data->>'priority')::store_priority, priority),
          status                  = COALESCE((v_store_data->>'status')::store_status,   status),
          budget                  = COALESCE((v_store_data->>'budget')::numeric,         budget),
          category                = COALESCE(v_store_data->>'category',                category),
          store_group_url         = COALESCE(v_store_data->>'store_group_url',         store_group_url),
          subscription_start_date = COALESCE((v_store_data->>'subscription_start_date')::date, subscription_start_date),
          account_manager_id      = COALESCE((v_store_data->>'account_manager_id')::uuid, account_manager_id),
          media_buyer_id          = COALESCE((v_store_data->>'media_buyer_id')::uuid,   media_buyer_id),
          notes                   = COALESCE(v_store_data->>'notes',                   notes),
          updated_at              = now()
        WHERE id = v_existing_id
        RETURNING id INTO v_store_id;

        v_action  := 'update';
        v_updated := v_updated + 1;

      ELSE
        -- ── INSERT ──────────────────────────────────────────────
        INSERT INTO stores (
          store_url, store_name, owner_name, owner_phone, owner_email,
          priority, status, budget, category, store_group_url,
          subscription_start_date, account_manager_id, media_buyer_id, notes
        ) VALUES (
          v_store_data->>'store_url',
          v_store_data->>'store_name',
          v_store_data->>'owner_name',
          v_store_data->>'owner_phone',
          v_store_data->>'owner_email',
          COALESCE((v_store_data->>'priority')::store_priority, 'medium'),
          COALESCE((v_store_data->>'status')::store_status,     'new'),
          (v_store_data->>'budget')::numeric,
          v_store_data->>'category',
          v_store_data->>'store_group_url',
          (v_store_data->>'subscription_start_date')::date,
          (v_store_data->>'account_manager_id')::uuid,
          (v_store_data->>'media_buyer_id')::uuid,
          v_store_data->>'notes'
        )
        RETURNING id INTO v_store_id;

        v_action   := 'insert';
        v_inserted := v_inserted + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- تسجيل الخطأ والمتابعة مع الصفوف الأخرى
      v_error  := SQLERRM;
      v_action := 'error';
      v_errors := v_errors + 1;
    END;

    -- إضافة نتيجة الصف
    v_results := v_results || jsonb_build_object(
      'row_index',   v_row_index,
      'store_id',    v_store_id,
      'action',      v_action,
      'matched_by',  v_matched_by,
      'error',       v_error
    );

  END LOOP;

  -- إعادة الملخص + تفاصيل كل صف
  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated',  v_updated,
    'skipped',  v_skipped,
    'errors',   v_errors,
    'rows',     v_results
  );
END;
$$;

-- منح صلاحية التنفيذ لـ service_role فقط
REVOKE ALL ON FUNCTION import_stores_bulk(jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION import_stores_bulk(jsonb) TO service_role;

-- ── Fallback: إذا لم تكن الـ ENUMs موجودة استخدم text ──────────
-- (يُعدَّل حسب schema الفعلي للمشروع)
COMMENT ON FUNCTION import_stores_bulk(jsonb) IS
  'Bulk upsert stores from import job rows. Dedup by store_url > owner_phone > owner_email. Returns per-row results.';
