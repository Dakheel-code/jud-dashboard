-- =====================================================
-- Jud Tasks Upgrade - Roles, Comments, Attachments, Help Requests
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1) HELPER FUNCTIONS FOR ROLE CHECKING
-- =====================================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is manager
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'team_leader', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is member
CREATE OR REPLACE FUNCTION is_member()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2) UPDATE store_tasks TABLE (add missing fields)
-- =====================================================

-- Add is_global field if not exists
ALTER TABLE store_tasks ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE;

-- Add duration_days field if not exists
ALTER TABLE store_tasks ADD COLUMN IF NOT EXISTS duration_days INTEGER;

-- Add created_by field if not exists
ALTER TABLE store_tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- =====================================================
-- 3) CREATE TASK COMMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES store_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for task_comments
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at DESC);

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_comments
DROP POLICY IF EXISTS "Users can view comments on accessible tasks" ON task_comments;
CREATE POLICY "Users can view comments on accessible tasks" ON task_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON task_comments;
CREATE POLICY "Users can create comments" ON task_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON task_comments;
CREATE POLICY "Users can update own comments" ON task_comments
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "Users can delete own comments or admin" ON task_comments;
CREATE POLICY "Users can delete own comments or admin" ON task_comments
  FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- =====================================================
-- 4) CREATE TASK ATTACHMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES store_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT, -- 'image', 'document', 'video', 'other'
  file_size INTEGER, -- in bytes
  storage_path TEXT, -- Supabase storage path
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for task_attachments
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_user_id ON task_attachments(user_id);

-- Enable RLS
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_attachments
DROP POLICY IF EXISTS "Users can view attachments on accessible tasks" ON task_attachments;
CREATE POLICY "Users can view attachments on accessible tasks" ON task_attachments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can upload attachments" ON task_attachments;
CREATE POLICY "Users can upload attachments" ON task_attachments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own attachments or admin" ON task_attachments;
CREATE POLICY "Users can delete own attachments or admin" ON task_attachments
  FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- =====================================================
-- 5) CREATE HELP REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES store_tasks(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES admin_users(id) ON DELETE SET NULL, -- who should help
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  resolved_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for task_help_requests
CREATE INDEX IF NOT EXISTS idx_task_help_requests_task_id ON task_help_requests(task_id);
CREATE INDEX IF NOT EXISTS idx_task_help_requests_requester_id ON task_help_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_task_help_requests_assigned_to ON task_help_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_task_help_requests_status ON task_help_requests(status);

-- Enable RLS
ALTER TABLE task_help_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_help_requests
DROP POLICY IF EXISTS "Users can view help requests" ON task_help_requests;
CREATE POLICY "Users can view help requests" ON task_help_requests
  FOR SELECT USING (
    is_admin() OR 
    is_manager() OR 
    requester_id = auth.uid() OR 
    assigned_to = auth.uid()
  );

DROP POLICY IF EXISTS "Users can create help requests" ON task_help_requests;
CREATE POLICY "Users can create help requests" ON task_help_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Managers can update help requests" ON task_help_requests;
CREATE POLICY "Managers can update help requests" ON task_help_requests
  FOR UPDATE USING (
    is_admin() OR 
    is_manager() OR 
    requester_id = auth.uid() OR 
    assigned_to = auth.uid()
  );

-- =====================================================
-- 6) CREATE TASK REASSIGNMENT HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_reassignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES store_tasks(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  reassigned_by UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for task_reassignments
CREATE INDEX IF NOT EXISTS idx_task_reassignments_task_id ON task_reassignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reassignments_from_user ON task_reassignments(from_user_id);
CREATE INDEX IF NOT EXISTS idx_task_reassignments_to_user ON task_reassignments(to_user_id);

-- Enable RLS
ALTER TABLE task_reassignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_reassignments
DROP POLICY IF EXISTS "Users can view reassignment history" ON task_reassignments;
CREATE POLICY "Users can view reassignment history" ON task_reassignments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Managers can create reassignments" ON task_reassignments;
CREATE POLICY "Managers can create reassignments" ON task_reassignments
  FOR INSERT WITH CHECK (is_admin() OR is_manager());

-- =====================================================
-- 7) CREATE TASK ACTIVITY LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES store_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'commented', 'attached', 'reassigned', 'help_requested', 'status_changed'
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for task_activity_log
CREATE INDEX IF NOT EXISTS idx_task_activity_log_task_id ON task_activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_log_user_id ON task_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_log_created_at ON task_activity_log(created_at DESC);

-- Enable RLS
ALTER TABLE task_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_activity_log
DROP POLICY IF EXISTS "Users can view activity log" ON task_activity_log;
CREATE POLICY "Users can view activity log" ON task_activity_log
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert activity log" ON task_activity_log;
CREATE POLICY "System can insert activity log" ON task_activity_log
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- 8) ALLOW ALL OPERATIONS (for development)
-- =====================================================

-- Temporarily allow all operations for easier development
CREATE POLICY IF NOT EXISTS "Allow all on task_comments" ON task_comments FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all on task_attachments" ON task_attachments FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all on task_help_requests" ON task_help_requests FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all on task_reassignments" ON task_reassignments FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all on task_activity_log" ON task_activity_log FOR ALL USING (true);

-- =====================================================
-- 9) CREATE STORAGE BUCKET FOR ATTACHMENTS
-- =====================================================

-- Note: Run this separately in Supabase Dashboard > Storage
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('task-attachments', 'task-attachments', true)
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- DONE! 
-- =====================================================
