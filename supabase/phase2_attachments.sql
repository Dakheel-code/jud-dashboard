-- =====================================================
-- PHASE 2: Attachments System - Storage + RLS
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- A) CREATE STORAGE BUCKET (Run in Supabase Dashboard > Storage)
-- =====================================================
-- Note: Create bucket manually in Supabase Dashboard:
-- 1. Go to Storage
-- 2. Create new bucket: "task-attachments"
-- 3. Set to PRIVATE (not public)

-- Or run this SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments', 
  'task-attachments', 
  false,  -- PRIVATE bucket
  26214400,  -- 25MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv', 'application/zip', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 26214400,
  public = false;

-- =====================================================
-- B) UPDATE task_attachments TABLE
-- =====================================================

-- Drop old columns if they exist with different names
ALTER TABLE task_attachments DROP COLUMN IF EXISTS user_id;
ALTER TABLE task_attachments DROP COLUMN IF EXISTS file_url;
ALTER TABLE task_attachments DROP COLUMN IF EXISTS storage_path;

-- Add new columns
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS uploader_id UUID REFERENCES admin_users(id) ON DELETE CASCADE;
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Update file_size to bigint if needed
ALTER TABLE task_attachments ALTER COLUMN file_size TYPE BIGINT USING file_size::bigint;

-- Make file_path NOT NULL (after migration)
-- ALTER TABLE task_attachments ALTER COLUMN file_path SET NOT NULL;

-- Create/Update indexes
DROP INDEX IF EXISTS idx_task_attachments_task_id;
DROP INDEX IF EXISTS idx_task_attachments_user_id;
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_created 
  ON task_attachments(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploader 
  ON task_attachments(uploader_id);

-- =====================================================
-- C) RLS POLICIES FOR task_attachments
-- =====================================================

-- Enable RLS
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all on task_attachments" ON task_attachments;
DROP POLICY IF EXISTS "attachments_select_policy" ON task_attachments;
DROP POLICY IF EXISTS "attachments_insert_policy" ON task_attachments;
DROP POLICY IF EXISTS "attachments_delete_policy" ON task_attachments;
DROP POLICY IF EXISTS "Users can view attachments on accessible tasks" ON task_attachments;
DROP POLICY IF EXISTS "Users can upload attachments" ON task_attachments;
DROP POLICY IF EXISTS "Users can delete own attachments or admin" ON task_attachments;

-- SELECT: allowed if can_read_task(task_id)
CREATE POLICY "attachments_select_policy" ON task_attachments
  FOR SELECT
  USING (can_read_task(task_id));

-- INSERT: allowed if can_read_task(task_id) AND uploader_id = auth.uid()
CREATE POLICY "attachments_insert_policy" ON task_attachments
  FOR INSERT
  WITH CHECK (
    can_read_task(task_id) 
    AND uploader_id = auth.uid()
  );

-- DELETE: allowed if uploader_id = auth.uid() OR is_admin() OR is_manager()
CREATE POLICY "attachments_delete_policy" ON task_attachments
  FOR DELETE
  USING (
    uploader_id = auth.uid() 
    OR is_admin() 
    OR is_manager()
  );

-- =====================================================
-- D) STORAGE POLICIES FOR task-attachments BUCKET
-- =====================================================

-- Helper function to extract task_id from storage path
-- Path format: {task_id}/{attachment_id}-{safeFileName}
CREATE OR REPLACE FUNCTION get_task_id_from_path(file_path TEXT)
RETURNS UUID AS $$
DECLARE
  path_parts TEXT[];
  task_id_str TEXT;
BEGIN
  -- Split path by '/'
  path_parts := string_to_array(file_path, '/');
  
  -- First part should be task_id
  IF array_length(path_parts, 1) >= 1 THEN
    task_id_str := path_parts[1];
    -- Try to cast to UUID
    BEGIN
      RETURN task_id_str::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "task_attachments_delete" ON storage.objects;

-- SELECT: Allow reading files if user can read the task
CREATE POLICY "task_attachments_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'task-attachments'
    AND can_read_task(get_task_id_from_path(name))
  );

-- INSERT: Allow uploading files if user can read the task
CREATE POLICY "task_attachments_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments'
    AND can_read_task(get_task_id_from_path(name))
  );

-- DELETE: Allow deleting files if user is admin/manager or uploaded the file
CREATE POLICY "task_attachments_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'task-attachments'
    AND (
      is_admin() 
      OR is_manager()
      OR owner = auth.uid()
    )
  );

-- =====================================================
-- E) TEMPORARY: Allow all for development
-- =====================================================

-- Uncomment these for easier development (remove in production)
-- CREATE POLICY "dev_allow_all_select" ON storage.objects FOR SELECT USING (bucket_id = 'task-attachments');
-- CREATE POLICY "dev_allow_all_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'task-attachments');
-- CREATE POLICY "dev_allow_all_delete" ON storage.objects FOR DELETE USING (bucket_id = 'task-attachments');

-- For task_attachments table (development)
CREATE POLICY "dev_allow_all_attachments" ON task_attachments FOR ALL USING (true);

-- =====================================================
-- DONE!
-- =====================================================
