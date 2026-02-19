-- =====================================================
-- Meta Ads Integration — Phase 1: Database Schema
-- =====================================================

-- ─────────────────────────────────────────────────────
-- 1.1 store_meta_connections
--     ربط حساب ميتا بكل متجر (one store → one active connection)
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_meta_connections (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  meta_user_id          text NOT NULL,
  meta_user_name        text,
  ad_account_id         text,                   -- يُختار بعد الربط — nullable
  ad_account_name       text,
  access_token_encrypted text NOT NULL,         -- مشفّر قبل الحفظ
  token_expires_at      timestamptz,
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'revoked', 'error')),
  last_sync_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- فهرس: بحث سريع بالمتجر
CREATE INDEX IF NOT EXISTS idx_meta_connections_store_id
  ON store_meta_connections(store_id);

-- فهرس: بحث بالحساب الإعلاني
CREATE INDEX IF NOT EXISTS idx_meta_connections_ad_account
  ON store_meta_connections(ad_account_id);

-- trigger: تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_meta_connections_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meta_connections_updated_at ON store_meta_connections;
CREATE TRIGGER trg_meta_connections_updated_at
  BEFORE UPDATE ON store_meta_connections
  FOR EACH ROW EXECUTE FUNCTION update_meta_connections_updated_at();


-- ─────────────────────────────────────────────────────
-- 1.2 meta_ads_cache
--     كاش الإعلانات — يُحدَّث عند كل sync
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meta_ads_cache (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  ad_account_id         text NOT NULL,
  ad_id                 text NOT NULL,
  ad_name               text,
  campaign_id           text,
  campaign_name         text,
  adset_id              text,
  adset_name            text,
  status                text,                   -- ACTIVE / PAUSED / DELETED …
  effective_status      text,                   -- ACTIVE / PAUSED / DISAPPROVED …
  creative_preview_url  text,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- unique: لا تكرار لنفس الإعلان في نفس الحساب
CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_ads_cache_unique
  ON meta_ads_cache(ad_account_id, ad_id);

-- فهرس: جلب إعلانات متجر معين
CREATE INDEX IF NOT EXISTS idx_meta_ads_cache_store_id
  ON meta_ads_cache(store_id);

-- فهرس: جلب إعلانات حملة معينة
CREATE INDEX IF NOT EXISTS idx_meta_ads_cache_campaign_id
  ON meta_ads_cache(campaign_id);


-- ─────────────────────────────────────────────────────
-- 1.3 meta_insights_cache
--     كاش الإحصائيات اليومية لكل حساب إعلاني
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meta_insights_cache (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  ad_account_id         text NOT NULL,
  ad_id                 text,                   -- null = إحصائيات الحساب كله
  campaign_id           text,
  date_start            date NOT NULL,
  date_stop             date NOT NULL,
  spend                 numeric(12, 2) DEFAULT 0,
  impressions           bigint DEFAULT 0,
  clicks                bigint DEFAULT 0,
  reach                 bigint DEFAULT 0,
  ctr                   numeric(8, 4) DEFAULT 0,   -- نسبة النقر (%)
  cpc                   numeric(10, 4) DEFAULT 0,  -- تكلفة النقرة
  cpm                   numeric(10, 4) DEFAULT 0,  -- تكلفة الألف ظهور
  conversions           bigint DEFAULT 0,
  cost_per_conversion   numeric(10, 4) DEFAULT 0,
  currency              text DEFAULT 'SAR',
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- unique: لا تكرار لنفس الفترة + الحساب + الإعلان
CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_insights_unique
  ON meta_insights_cache(ad_account_id, COALESCE(ad_id, ''), date_start, date_stop);

-- فهرس: جلب إحصائيات متجر معين
CREATE INDEX IF NOT EXISTS idx_meta_insights_store_id
  ON meta_insights_cache(store_id);

-- فهرس: جلب إحصائيات بالتاريخ
CREATE INDEX IF NOT EXISTS idx_meta_insights_dates
  ON meta_insights_cache(date_start, date_stop);

-- trigger: تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_meta_insights_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meta_insights_updated_at ON meta_insights_cache;
CREATE TRIGGER trg_meta_insights_updated_at
  BEFORE UPDATE ON meta_insights_cache
  FOR EACH ROW EXECUTE FUNCTION update_meta_insights_updated_at();


-- ─────────────────────────────────────────────────────
-- 1.4 meta_oauth_states
--     حفظ state مؤقتاً أثناء OAuth flow (CSRF protection)
--     يُحذف تلقائياً بعد الاستخدام أو انتهاء الصلاحية
-- ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meta_oauth_states (
  state       text PRIMARY KEY,
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_oauth_states_store_id
  ON meta_oauth_states(store_id);

CREATE INDEX IF NOT EXISTS idx_meta_oauth_states_expires
  ON meta_oauth_states(expires_at);


-- ─────────────────────────────────────────────────────
-- RLS (Row Level Security) — تفعيل الحماية
-- ─────────────────────────────────────────────────────
ALTER TABLE store_meta_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ads_cache         ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_insights_cache    ENABLE ROW LEVEL SECURITY;

-- سياسة: service_role يملك صلاحية كاملة (API routes تستخدم service key)
DROP POLICY IF EXISTS "service_role_full_access_meta_connections" ON store_meta_connections;
CREATE POLICY "service_role_full_access_meta_connections"
  ON store_meta_connections FOR ALL
  TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access_meta_ads" ON meta_ads_cache;
CREATE POLICY "service_role_full_access_meta_ads"
  ON meta_ads_cache FOR ALL
  TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_full_access_meta_insights" ON meta_insights_cache;
CREATE POLICY "service_role_full_access_meta_insights"
  ON meta_insights_cache FOR ALL
  TO service_role USING (true) WITH CHECK (true);

ALTER TABLE meta_oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_meta_oauth_states" ON meta_oauth_states;
CREATE POLICY "service_role_full_access_meta_oauth_states"
  ON meta_oauth_states FOR ALL
  TO service_role USING (true) WITH CHECK (true);
