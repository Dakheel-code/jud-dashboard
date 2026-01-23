-- =====================================================
-- FIX: Add missing columns to existing tables
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 0) FIX store_tasks TABLE (for task creation)
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'store_tasks' AND column_name = 'is_individual') THEN
    ALTER TABLE store_tasks ADD COLUMN is_individual BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'store_tasks' AND column_name = 'created_by') THEN
    ALTER TABLE store_tasks ADD COLUMN created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'store_tasks' AND column_name = 'assign_to_all') THEN
    ALTER TABLE store_tasks ADD COLUMN assign_to_all BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'store_tasks' AND column_name = 'assigned_roles') THEN
    ALTER TABLE store_tasks ADD COLUMN assigned_roles TEXT[];
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'store_tasks' AND column_name = 'updated_at') THEN
    ALTER TABLE store_tasks ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'store_tasks' AND column_name = 'last_activity_at') THEN
    ALTER TABLE store_tasks ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- =====================================================
-- 1) FIX task_help_requests TABLE
-- Check current structure first
-- =====================================================

-- Add helper_id if not exists (might be named differently)
DO $$ 
BEGIN
  -- Check if helper_id exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'task_help_requests' AND column_name = 'helper_id') THEN
    -- Check if assigned_to exists (old name)
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'task_help_requests' AND column_name = 'assigned_to') THEN
      ALTER TABLE task_help_requests RENAME COLUMN assigned_to TO helper_id;
    ELSE
      ALTER TABLE task_help_requests ADD COLUMN helper_id UUID REFERENCES admin_users(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- Add requester_id if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'task_help_requests' AND column_name = 'requester_id') THEN
    ALTER TABLE task_help_requests ADD COLUMN requester_id UUID REFERENCES admin_users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add responded_at if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'task_help_requests' AND column_name = 'responded_at') THEN
    ALTER TABLE task_help_requests ADD COLUMN responded_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- =====================================================
-- 2) FIX notifications TABLE
-- =====================================================

-- Add user_id if not exists (might be store_id)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
    ALTER TABLE notifications ADD COLUMN user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add type if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' AND column_name = 'type') THEN
    ALTER TABLE notifications ADD COLUMN type TEXT DEFAULT 'general';
  END IF;
END $$;

-- Add read_at if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' AND column_name = 'read_at') THEN
    ALTER TABLE notifications ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add link if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' AND column_name = 'link') THEN
    ALTER TABLE notifications ADD COLUMN link TEXT;
  END IF;
END $$;

-- Add metadata if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' AND column_name = 'metadata') THEN
    ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- =====================================================
-- 3) CREATE INDEXES (ignore if exists)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_help_requests_helper_status ON task_help_requests(helper_id, status);
CREATE INDEX IF NOT EXISTS idx_help_requests_task_created ON task_help_requests(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- =====================================================
-- DONE!
-- =====================================================
SELECT 'Tables fixed successfully!' as result;
