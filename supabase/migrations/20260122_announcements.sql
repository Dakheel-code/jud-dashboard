-- =============================================
-- Announcements System Migration
-- =============================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS announcement_recipients CASCADE;
DROP TABLE IF EXISTS announcement_reads CASCADE;
DROP TABLE IF EXISTS announcement_target_users CASCADE;
DROP TABLE IF EXISTS announcement_conditions CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;

-- =============================================
-- 1. Create announcements table
-- =============================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('normal', 'urgent', 'scheduled', 'conditional')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'department', 'users')),
  target_department_id UUID NULL,
  target_user_ids UUID[] NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  send_at TIMESTAMPTZ NULL,
  sent_at TIMESTAMPTZ NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for better performance
CREATE INDEX idx_announcements_sent_at ON announcements(sent_at);
CREATE INDEX idx_announcements_is_active ON announcements(is_active);
CREATE INDEX idx_announcements_type ON announcements(type);
CREATE INDEX idx_announcements_created_by ON announcements(created_by);

-- =============================================
-- 2. Create announcement_recipients table
-- =============================================
CREATE TABLE announcement_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ NULL,
  UNIQUE(announcement_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_announcement_recipients_user_id ON announcement_recipients(user_id);
CREATE INDEX idx_announcement_recipients_announcement_id ON announcement_recipients(announcement_id);
CREATE INDEX idx_announcement_recipients_read_at ON announcement_recipients(read_at);

-- =============================================
-- 3. Enable Row Level Security
-- =============================================
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_recipients ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. RLS Policies for announcements
-- =============================================

-- Allow authenticated users to read active announcements
CREATE POLICY "announcements_select_authenticated" ON announcements
  FOR SELECT
  USING (true);

-- Allow service role to do everything (for API)
CREATE POLICY "announcements_all_service" ON announcements
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================
-- 5. RLS Policies for announcement_recipients
-- =============================================

-- Allow users to read their own recipients
CREATE POLICY "recipients_select_own" ON announcement_recipients
  FOR SELECT
  USING (true);

-- Allow users to update their own read_at
CREATE POLICY "recipients_update_own" ON announcement_recipients
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow service role to insert (for API)
CREATE POLICY "recipients_insert_service" ON announcement_recipients
  FOR INSERT
  WITH CHECK (true);

-- Allow service role to delete (for API)
CREATE POLICY "recipients_delete_service" ON announcement_recipients
  FOR DELETE
  USING (true);

-- =============================================
-- 6. Helper function to get user announcements
-- =============================================
CREATE OR REPLACE FUNCTION get_user_announcements(p_user_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  type TEXT,
  priority TEXT,
  created_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.content,
    a.type,
    a.priority,
    a.created_at,
    a.sent_at,
    ar.read_at,
    ar.delivered_at
  FROM announcement_recipients ar
  JOIN announcements a ON a.id = ar.announcement_id
  WHERE ar.user_id = p_user_id
    AND a.is_active = true
    AND a.sent_at IS NOT NULL
    AND a.sent_at <= NOW()
  ORDER BY a.sent_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. Grant permissions
-- =============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON announcements TO anon, authenticated;
GRANT SELECT, UPDATE ON announcement_recipients TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_announcements TO anon, authenticated;

-- =============================================
-- Comments
-- =============================================
COMMENT ON TABLE announcements IS 'Stores all system announcements';
COMMENT ON TABLE announcement_recipients IS 'Tracks which users received which announcements and their read status';
COMMENT ON COLUMN announcements.send_at IS 'Scheduled send time for scheduled announcements';
COMMENT ON COLUMN announcements.sent_at IS 'Actual send time, NULL means not sent yet';
COMMENT ON COLUMN announcement_recipients.delivered_at IS 'When the announcement was delivered to the user';
COMMENT ON COLUMN announcement_recipients.read_at IS 'When the user read the announcement, NULL means unread';
