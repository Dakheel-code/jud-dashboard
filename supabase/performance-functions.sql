-- =====================================================
-- PHASE 1: Performance RPC Functions + Indexes
-- نفّذ هذا الملف في Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. Indexes (إجباري)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tasks_progress_store_id ON tasks_progress(store_id);
CREATE INDEX IF NOT EXISTS idx_tasks_progress_is_done ON tasks_progress(is_done);
CREATE INDEX IF NOT EXISTS idx_tasks_progress_store_done ON tasks_progress(store_id, is_done);
CREATE INDEX IF NOT EXISTS idx_tasks_progress_task_done ON tasks_progress(task_id, is_done);
CREATE INDEX IF NOT EXISTS idx_notifications_store_id ON notifications(store_id);

-- =====================================================
-- 2. RPC: get_store_completed_counts
--    يرجع عدد المهام المكتملة لكل متجر (GROUP BY)
--    بدلاً من جلب كل الصفوف وعمل filter في JS
-- =====================================================

CREATE OR REPLACE FUNCTION get_store_completed_counts()
RETURNS TABLE(store_id UUID, completed_count BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT store_id, COUNT(*) as completed_count
  FROM tasks_progress
  WHERE is_done = true
  GROUP BY store_id;
$$;

-- =====================================================
-- 3. RPC: get_task_completed_counts
--    يرجع عدد الإنجازات لكل مهمة (GROUP BY)
--    بدلاً من جلب كل الصفوف وعمل filter في JS
-- =====================================================

CREATE OR REPLACE FUNCTION get_task_completed_counts()
RETURNS TABLE(task_id UUID, completed_count BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT task_id, COUNT(*) as completed_count
  FROM tasks_progress
  WHERE is_done = true
  GROUP BY task_id;
$$;

-- =====================================================
-- 4. RPC: get_store_rank (Window Function)
--    يرجع ترتيب متجر واحد — صف واحد فقط
--    بدلاً من جلب كل المتاجر + كل المهام + كل التقدم
-- =====================================================

CREATE OR REPLACE FUNCTION get_store_rank(target_store_id UUID)
RETURNS TABLE(rank BIGINT, total_stores BIGINT, completion_percentage INTEGER)
LANGUAGE sql
STABLE
AS $$
  WITH total AS (
    SELECT COUNT(*)::INTEGER as task_count FROM tasks
  ),
  store_completions AS (
    SELECT 
      s.id as store_id,
      CASE WHEN t.task_count > 0 
        THEN ROUND((COALESCE(tp.done_count, 0)::NUMERIC / t.task_count) * 100)::INTEGER
        ELSE 0 
      END as pct
    FROM stores s
    CROSS JOIN total t
    LEFT JOIN (
      SELECT store_id, COUNT(*) as done_count
      FROM tasks_progress
      WHERE is_done = true
      GROUP BY store_id
    ) tp ON tp.store_id = s.id
  ),
  ranked AS (
    SELECT 
      store_id,
      pct,
      RANK() OVER (ORDER BY pct DESC) as rnk,
      COUNT(*) OVER () as total_count
    FROM store_completions
  )
  SELECT 
    rnk as rank,
    total_count as total_stores,
    pct as completion_percentage
  FROM ranked
  WHERE store_id = target_store_id;
$$;
