-- جدول حسابات المنصات الإعلانية
CREATE TABLE IF NOT EXISTS ad_platform_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('snapchat', 'tiktok', 'meta', 'google')),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connected', 'needs_reauth', 'error')),
  organization_id TEXT,
  external_user_id TEXT,
  ad_account_id TEXT,
  ad_account_name TEXT,
  scopes TEXT[],
  access_token_enc TEXT,
  refresh_token_enc TEXT,
  token_expires_at TIMESTAMPTZ,
  last_connected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, platform)
);

-- Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_ad_platform_accounts_store_id ON ad_platform_accounts(store_id);
CREATE INDEX IF NOT EXISTS idx_ad_platform_accounts_platform ON ad_platform_accounts(platform);

-- جدول OAuth States للأمان
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('snapchat', 'tiktok', 'meta', 'google')),
  state TEXT UNIQUE NOT NULL,
  code_verifier_enc TEXT,
  redirect_uri TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

-- RLS Policies
ALTER TABLE ad_platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- سياسة: المستخدمون يمكنهم قراءة وتعديل حسابات متاجرهم فقط
CREATE POLICY "Users can view their store ad accounts" ON ad_platform_accounts
  FOR SELECT USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their store ad accounts" ON ad_platform_accounts
  FOR INSERT WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their store ad accounts" ON ad_platform_accounts
  FOR UPDATE USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their store ad accounts" ON ad_platform_accounts
  FOR DELETE USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_user_id = auth.uid()
    )
  );

-- oauth_states: Server-only (لا يُسمح للعميل بالقراءة)
CREATE POLICY "No client access to oauth_states" ON oauth_states
  FOR ALL USING (false);

-- Function لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger لتحديث updated_at
DROP TRIGGER IF EXISTS update_ad_platform_accounts_updated_at ON ad_platform_accounts;
CREATE TRIGGER update_ad_platform_accounts_updated_at
  BEFORE UPDATE ON ad_platform_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function لحذف OAuth states المنتهية
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states WHERE expires_at < NOW();
END;
$$ language 'plpgsql';
