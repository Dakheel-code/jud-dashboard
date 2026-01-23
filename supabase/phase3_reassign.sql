-- =====================================================
-- PHASE 3: Reassign Task - DB + RLS
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- A) DATABASE SCHEMA UPDATES
-- =====================================================

-- 1) Add created_by column if not exists
ALTER TABLE store_tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- 2) Add updated_at column if not exists
ALTER TABLE store_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3) Add last_activity_at column if not exists
ALTER TABLE store_tasks ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4) Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_store_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_store_tasks_updated_at ON store_tasks;
CREATE TRIGGER trigger_store_tasks_updated_at
  BEFORE UPDATE ON store_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_store_tasks_updated_at();

-- 5) Create index for last_activity_at
CREATE INDEX IF NOT EXISTS idx_store_tasks_last_activity ON store_tasks(last_activity_at DESC);

-- =====================================================
-- B) RLS POLICIES FOR REASSIGNMENT
-- =====================================================

-- Helper function: Check if user can reassign tasks
CREATE OR REPLACE FUNCTION can_reassign_task(p_task_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_current_assignee UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user role
  SELECT role INTO v_user_role 
  FROM admin_users 
  WHERE id = v_user_id;
  
  -- Admin and manager can always reassign
  IF v_user_role IN ('super_admin', 'admin', 'team_leader', 'manager') THEN
    RETURN TRUE;
  END IF;
  
  -- Optional: Current assignee can reassign (uncomment if needed)
  -- SELECT assigned_to INTO v_current_assignee
  -- FROM store_tasks
  -- WHERE id = p_task_id;
  -- 
  -- IF v_current_assignee = v_user_id THEN
  --   RETURN TRUE;
  -- END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing update policies
DROP POLICY IF EXISTS "tasks_update_policy" ON store_tasks;
DROP POLICY IF EXISTS "tasks_update_assignee_policy" ON store_tasks;

-- Policy: Only admin/manager can update assignee_id
-- Note: This is enforced at API level, but we add RLS as extra security
CREATE POLICY "tasks_update_policy" ON store_tasks
  FOR UPDATE
  USING (true)  -- Can see all tasks they have access to
  WITH CHECK (
    -- Admin/Manager can update anything
    is_admin() OR is_manager()
    -- Or user is updating their own task (not assignee)
    OR (assigned_to = auth.uid() AND created_by = auth.uid())
  );

-- =====================================================
-- C) SYSTEM USER FOR COMMENTS (Optional)
-- =====================================================

-- Create a system user for automated comments (if not exists)
-- This is optional - we can use NULL author_id for system comments instead

-- INSERT INTO admin_users (id, username, name, password_hash, role, is_active)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   'system',
--   'النظام',
--   'not_a_real_password_hash',
--   'system',
--   true
-- )
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- D) ALLOW SYSTEM COMMENTS (author_id can be NULL)
-- =====================================================

-- Make author_id nullable for system comments
ALTER TABLE task_comments ALTER COLUMN author_id DROP NOT NULL;

-- Add is_system column to identify system comments
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- =====================================================
-- DONE!
-- =====================================================
