-- جدول إعدادات الإشعارات لكل مستخدم
CREATE TABLE IF NOT EXISTS notification_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE,
  settings    JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_settings_all" ON notification_settings;
CREATE POLICY "notif_settings_all" ON notification_settings FOR ALL USING (TRUE);
