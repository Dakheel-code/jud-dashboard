-- =====================================================
-- Google Ads Integration - جداول قاعدة البيانات
-- =====================================================

-- جدول اتصالات Google Ads
CREATE TABLE IF NOT EXISTS google_ads_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  customer_name TEXT,
  manager_id TEXT,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  developer_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, customer_id)
);

-- جدول كاش حملات Google Ads
CREATE TABLE IF NOT EXISTS google_ads_campaigns_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  status TEXT,
  advertising_channel_type TEXT,
  budget_amount_micros BIGINT,
  bidding_strategy_type TEXT,
  campaign_data JSONB,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, campaign_id)
);

-- جدول كاش تقارير Google Ads
CREATE TABLE IF NOT EXISTS google_ads_reports_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL,
  campaign_id TEXT,
  report_date DATE NOT NULL,
  cost_micros BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  ctr DECIMAL(8,6) DEFAULT 0,
  average_cpc_micros BIGINT DEFAULT 0,
  conversions DECIMAL(12,4) DEFAULT 0,
  cost_per_conversion_micros BIGINT DEFAULT 0,
  report_data JSONB,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, campaign_id, report_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_google_ads_connections_store_id ON google_ads_connections(store_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_connections_is_active ON google_ads_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_google_ads_campaigns_cache_store_id ON google_ads_campaigns_cache(store_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_reports_cache_store_id ON google_ads_reports_cache(store_id);
CREATE INDEX IF NOT EXISTS idx_google_ads_reports_cache_report_date ON google_ads_reports_cache(report_date);

-- RLS
ALTER TABLE google_ads_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_ads_campaigns_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_ads_reports_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_google_ads_connections" ON google_ads_connections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_google_ads_campaigns_cache" ON google_ads_campaigns_cache FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_google_ads_reports_cache" ON google_ads_reports_cache FOR ALL USING (true) WITH CHECK (true);

-- Trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION update_google_ads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_google_ads_connections_updated_at
  BEFORE UPDATE ON google_ads_connections
  FOR EACH ROW EXECUTE FUNCTION update_google_ads_updated_at();
