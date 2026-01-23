-- =====================================================
-- PHASE 5: Notifications - DB + RLS
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- A) CREATE NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('reassign', 'help_request', 'help_response', 'mention', 'comment', 'task_update')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- =====================================================
-- B) RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "notifications_select" ON notifications;
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
DROP POLICY IF EXISTS "notifications_update" ON notifications;
DROP POLICY IF EXISTS "notifications_delete" ON notifications;

-- SELECT: user can only see their own notifications
CREATE POLICY "notifications_select" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- INSERT: system can insert (we'll use service role or allow all for now)
CREATE POLICY "notifications_insert" ON notifications
  FOR INSERT WITH CHECK (true);

-- UPDATE: user can only update their own (mark as read)
CREATE POLICY "notifications_update" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- DELETE: user can delete their own, or admin can delete any
CREATE POLICY "notifications_delete" ON notifications
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- =====================================================
-- C) HELPER FUNCTION TO CREATE NOTIFICATION
-- =====================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_body, p_link, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DEVELOPMENT: Allow all (remove in production)
-- =====================================================

-- Uncomment for development if RLS causes issues:
-- DROP POLICY IF EXISTS "dev_allow_all_notifications" ON notifications;
-- CREATE POLICY "dev_allow_all_notifications" ON notifications FOR ALL USING (true);

-- =====================================================
-- DONE!
-- =====================================================
