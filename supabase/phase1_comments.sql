-- =====================================================
-- PHASE 1: Comments System - DB + RLS
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- A) DATABASE SCHEMA
-- =====================================================

-- 1) Ensure admin_users.role exists with CHECK constraint
DO $$ 
BEGIN
  -- Add role column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' AND column_name = 'role'
  ) THEN
    ALTER TABLE admin_users ADD COLUMN role TEXT DEFAULT 'member' NOT NULL;
  END IF;
END $$;

-- Add CHECK constraint for role (drop if exists first)
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check 
  CHECK (role IN ('super_admin', 'admin', 'team_leader', 'manager', 'account_manager', 'member'));

-- 2) Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES store_tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_task_comments_task_created 
  ON task_comments(task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_comments_author 
  ON task_comments(author_id);

-- =====================================================
-- B) RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function: Check if user is manager
CREATE OR REPLACE FUNCTION is_manager()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'team_leader', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Main function: Check if user can read a task
CREATE OR REPLACE FUNCTION can_read_task(p_task_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- If no user, deny
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user role
  SELECT role INTO v_user_role 
  FROM admin_users 
  WHERE id = v_user_id;
  
  -- Admin and manager can read all tasks
  IF v_user_role IN ('super_admin', 'admin', 'team_leader', 'manager') THEN
    RETURN TRUE;
  END IF;
  
  -- Member can read if:
  -- 1. Task is global
  -- 2. Task is assigned to them
  -- 3. Task was created by them
  RETURN EXISTS (
    SELECT 1 FROM store_tasks t
    WHERE t.id = p_task_id
    AND (
      t.is_global = TRUE
      OR t.assigned_to = v_user_id
      OR t.created_by = v_user_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing policies
DROP POLICY IF EXISTS "comments_select_policy" ON task_comments;
DROP POLICY IF EXISTS "comments_insert_policy" ON task_comments;
DROP POLICY IF EXISTS "comments_delete_policy" ON task_comments;
DROP POLICY IF EXISTS "comments_update_policy" ON task_comments;
DROP POLICY IF EXISTS "Allow all on task_comments" ON task_comments;

-- SELECT: allowed if can_read_task(task_id)
CREATE POLICY "comments_select_policy" ON task_comments
  FOR SELECT
  USING (can_read_task(task_id));

-- INSERT: allowed if can_read_task(task_id) AND author_id = auth.uid()
CREATE POLICY "comments_insert_policy" ON task_comments
  FOR INSERT
  WITH CHECK (
    can_read_task(task_id) 
    AND author_id = auth.uid()
  );

-- DELETE: allowed if author_id = auth.uid() OR is_admin() OR is_manager()
CREATE POLICY "comments_delete_policy" ON task_comments
  FOR DELETE
  USING (
    author_id = auth.uid() 
    OR is_admin() 
    OR is_manager()
  );

-- UPDATE: only admins/managers can update (to keep simple)
CREATE POLICY "comments_update_policy" ON task_comments
  FOR UPDATE
  USING (is_admin() OR is_manager())
  WITH CHECK (is_admin() OR is_manager());

-- =====================================================
-- C) ADD MISSING COLUMNS TO store_tasks IF NEEDED
-- =====================================================

-- Add is_global column if not exists
ALTER TABLE store_tasks ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE;

-- Add created_by column if not exists
ALTER TABLE store_tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- =====================================================
-- DONE!
-- =====================================================
