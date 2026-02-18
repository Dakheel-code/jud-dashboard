-- إضافة index على external_user_id لتسريع البحث عن هويات Snapchat
-- يُستخدم في GET /api/integrations/snapchat/identities

CREATE INDEX IF NOT EXISTS idx_ad_platform_accounts_external_user_id
  ON ad_platform_accounts(external_user_id)
  WHERE external_user_id IS NOT NULL;

-- index مركّب للبحث بـ platform + external_user_id معاً
CREATE INDEX IF NOT EXISTS idx_ad_platform_accounts_platform_external_user
  ON ad_platform_accounts(platform, external_user_id)
  WHERE external_user_id IS NOT NULL;
