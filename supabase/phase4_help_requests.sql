-- =====================================================
-- PHASE 4: Help Requests - DB + RLS
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- A) CREATE TASK HELP REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES store_tasks(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  helper_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_help_requests_helper_status ON task_help_requests(helper_id, status);
CREATE INDEX IF NOT EXISTS idx_help_requests_task_created ON task_help_requests(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_help_requests_requester ON task_help_requests(requester_id);

-- =====================================================
-- B) RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE task_help_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "help_requests_select" ON task_help_requests;
DROP POLICY IF EXISTS "help_requests_insert" ON task_help_requests;
DROP POLICY IF EXISTS "help_requests_update" ON task_help_requests;
DROP POLICY IF EXISTS "help_requests_delete" ON task_help_requests;

-- SELECT: can see if can_read_task OR is helper
CREATE POLICY "help_requests_select" ON task_help_requests
  FOR SELECT USING (
    helper_id = auth.uid()
    OR requester_id = auth.uid()
    OR is_admin()
    OR is_manager()
  );

-- INSERT: requester must be current user
CREATE POLICY "help_requests_insert" ON task_help_requests
  FOR INSERT WITH CHECK (
    requester_id = auth.uid()
  );

-- UPDATE: helper can respond, or admin/manager can update
CREATE POLICY "help_requests_update" ON task_help_requests
  FOR UPDATE USING (
    helper_id = auth.uid()
    OR is_admin()
    OR is_manager()
  );

-- DELETE: admin/manager or requester when pending
CREATE POLICY "help_requests_delete" ON task_help_requests
  FOR DELETE USING (
    is_admin()
    OR is_manager()
    OR (requester_id = auth.uid() AND status = 'pending')
  );

-- =====================================================
-- DEVELOPMENT: Allow all (remove in production)
-- =====================================================

-- Uncomment for development if RLS causes issues:
-- DROP POLICY IF EXISTS "dev_allow_all_help_requests" ON task_help_requests;
-- CREATE POLICY "dev_allow_all_help_requests" ON task_help_requests FOR ALL USING (true);

-- =====================================================
-- DONE!
-- =====================================================
