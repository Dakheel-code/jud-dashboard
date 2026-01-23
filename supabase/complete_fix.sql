-- =====================================================
-- COMPLETE FIX: All tables for Task System
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1) FIX store_tasks TABLE
-- =====================================================

-- Add is_individual column
ALTER TABLE store_tasks ADD COLUMN IF NOT EXISTS is_individual BOOLEAN DEFAULT FALSE;

-- Add created_by column
ALTER TABLE store_tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- Add assign_to_all column
ALTER TABLE store_tasks ADD COLUMN IF NOT EXISTS assign_to_all BOOLEAN DEFAULT FALSE;

-- Add assigned_roles column
ALTER TABLE store_tasks ADD COLUMN IF NOT EXISTS assigned_roles TEXT[];

-- Add updated_at column
ALTER TABLE store_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add last_activity_at column
ALTER TABLE store_tasks ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- =====================================================
-- 2) CREATE/FIX task_participants TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES store_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'assignee',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_participants_task ON task_participants(task_id);
CREATE INDEX IF NOT EXISTS idx_task_participants_user ON task_participants(user_id);

-- =====================================================
-- 3) CREATE/FIX task_activity_log TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES store_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  meta JSONB DEFAULT '{}',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task ON task_activity_log(task_id, created_at DESC);

-- =====================================================
-- 4) FIX task_comments TABLE
-- =====================================================

-- Ensure table exists
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES store_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id, created_at DESC);

-- =====================================================
-- 5) FIX task_attachments TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES store_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_path TEXT,
  file_type TEXT,
  mime_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS uploader_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS mime_type TEXT;

CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments(task_id, created_at DESC);

-- =====================================================
-- 6) FIX task_help_requests TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES store_tasks(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  helper_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT
);

-- Add missing columns if table already exists
ALTER TABLE task_help_requests ADD COLUMN IF NOT EXISTS requester_id UUID REFERENCES admin_users(id) ON DELETE CASCADE;
ALTER TABLE task_help_requests ADD COLUMN IF NOT EXISTS helper_id UUID REFERENCES admin_users(id) ON DELETE CASCADE;
ALTER TABLE task_help_requests ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_help_requests_task ON task_help_requests(task_id, created_at DESC);

-- =====================================================
-- 7) FIX task_reassignments TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS task_reassignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES store_tasks(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  reassigned_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reassignments_task ON task_reassignments(task_id, created_at DESC);

-- =====================================================
-- 8) FIX notifications TABLE
-- =====================================================

-- Add missing columns
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- =====================================================
-- 9) DISABLE RLS FOR DEVELOPMENT (temporary)
-- =====================================================

ALTER TABLE store_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_help_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_reassignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- DONE!
-- =====================================================

SELECT 'All tables fixed successfully!' as result;
