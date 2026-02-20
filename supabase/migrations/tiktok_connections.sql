-- =====================================================
-- TikTok Ads Integration - جداول قاعدة البيانات
-- =====================================================

-- جدول اتصالات TikTok
CREATE TABLE IF NOT EXISTS tiktok_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL,
  advertiser_id TEXT NOT NULL,
  advertiser_name TEXT,
  access_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, advertiser_id)
);

-- جدول كاش حملات TikTok
CREATE TABLE IF NOT EXISTS tiktok_campaigns_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  advertiser_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  objective_type TEXT,
  budget DECIMAL(12,2),
  budget_mode TEXT,
  status TEXT,
  campaign_data JSONB,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, campaign_id)
);

-- جدول كاش تقارير TikTok
CREATE TABLE IF NOT EXISTS tiktok_reports_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  advertiser_id TEXT NOT NULL,
  campaign_id TEXT,
  report_date DATE NOT NULL,
  spend DECIMAL(12,2) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  ctr DECIMAL(8,4) DEFAULT 0,
  cpc DECIMAL(12,4) DEFAULT 0,
  cpm DECIMAL(12,4) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cost_per_conversion DECIMAL(12,4) DEFAULT 0,
  report_data JSONB,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, campaign_id, report_date)
);

-- =====================================================
-- Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tiktok_connections_store_id ON tiktok_connections(store_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_connections_is_active ON tiktok_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_tiktok_campaigns_cache_store_id ON tiktok_campaigns_cache(store_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_reports_cache_store_id ON tiktok_reports_cache(store_id);
CREATE INDEX IF NOT EXISTS idx_tiktok_reports_cache_report_date ON tiktok_reports_cache(report_date);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE tiktok_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiktok_campaigns_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiktok_reports_cache ENABLE ROW LEVEL SECURITY;

-- سياسات تسمح بالكل (نفس نمط الجداول الموجودة)
CREATE POLICY "Allow all on tiktok_connections" ON tiktok_connections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tiktok_campaigns_cache" ON tiktok_campaigns_cache FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tiktok_reports_cache" ON tiktok_reports_cache FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Trigger لتحديث updated_at تلقائياً
-- =====================================================

CREATE OR REPLACE FUNCTION update_tiktok_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tiktok_connections_updated_at
  BEFORE UPDATE ON tiktok_connections
  FOR EACH ROW EXECUTE FUNCTION update_tiktok_updated_at();
