-- =====================================================
-- PHASE 6: Dashboard Summary RPC + Query Hygiene
-- نفّذ هذا الملف في Supabase SQL Editor
-- =====================================================
-- ملاحظة: هذا الملف يعمل فقط على الجداول الموجودة فعلاً
-- إذا جدول store_tasks غير موجود، الـ RPCs ترجع قيم افتراضية

-- =====================================================
-- 1. Indexes — فقط على الجداول الموجودة
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_stores_is_active ON stores(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON admin_users(is_active);

-- =====================================================
-- 2. RPC: get_dashboard_kpis
--    يرجع KPIs — يتحقق من وجود store_tasks أولاً
-- =====================================================

CREATE OR REPLACE FUNCTION get_dashboard_kpis()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
  has_store_tasks BOOLEAN;
  has_announcements BOOLEAN;
BEGIN
  -- التحقق من وجود الجداول
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_tasks') INTO has_store_tasks;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'announcements') INTO has_announcements;

  SELECT json_build_object(
    'overdue_tasks', CASE WHEN has_store_tasks THEN (
      SELECT COUNT(*) FROM store_tasks 
      WHERE status NOT IN ('done', 'canceled') 
        AND due_date IS NOT NULL 
        AND due_date < now()
    ) ELSE 0 END,
    'today_tasks', CASE WHEN has_store_tasks THEN (
      SELECT COUNT(*) FROM store_tasks 
      WHERE status NOT IN ('done', 'canceled') 
        AND due_date >= date_trunc('day', now())
        AND due_date < date_trunc('day', now()) + interval '1 day'
    ) ELSE 0 END,
    'completed_this_week', CASE WHEN has_store_tasks THEN (
      SELECT COUNT(*) FROM store_tasks 
      WHERE status = 'done' 
        AND updated_at >= now() - interval '7 days'
    ) ELSE 0 END,
    'active_stores', (
      SELECT COUNT(*) FROM stores WHERE is_active IS NOT FALSE
    ),
    'total_stores', (
      SELECT COUNT(*) FROM stores
    ),
    'total_users', (
      SELECT COUNT(*) FROM admin_users WHERE is_active = true
    ),
    'unread_announcements', CASE WHEN has_announcements THEN (
      SELECT COUNT(*) FROM announcements WHERE status = 'sent'
    ) ELSE 0 END,
    'total_tasks_pending', CASE WHEN has_store_tasks THEN (
      SELECT COUNT(*) FROM store_tasks WHERE status = 'pending'
    ) ELSE 0 END,
    'total_tasks_in_progress', CASE WHEN has_store_tasks THEN (
      SELECT COUNT(*) FROM store_tasks WHERE status = 'in_progress'
    ) ELSE 0 END
  ) INTO result;
  
  RETURN result;
END;
$$;

-- =====================================================
-- 3. RPC: get_employee_performance
--    يرجع أداء الموظفين — يتحقق من وجود store_tasks
-- =====================================================

CREATE OR REPLACE FUNCTION get_employee_performance()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
  has_store_tasks BOOLEAN;
  week_ago TIMESTAMPTZ := now() - interval '7 days';
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_tasks') INTO has_store_tasks;

  IF NOT has_store_tasks THEN
    -- إذا الجدول غير موجود، نرجع المستخدمين بدون إحصائيات
    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
      SELECT id, name, username, avatar, role,
        0 as total_tasks, 0 as completed_tasks, 0 as overdue_tasks,
        0 as completed_this_week, 0 as completion_rate
      FROM admin_users WHERE is_active = true
    ) t;
    RETURN COALESCE(result, '[]'::JSON);
  END IF;

  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT 
      u.id, u.name, u.username, u.avatar, u.role,
      COALESCE(total.cnt, 0) as total_tasks,
      COALESCE(completed.cnt, 0) as completed_tasks,
      COALESCE(overdue.cnt, 0) as overdue_tasks,
      COALESCE(week_done.cnt, 0) as completed_this_week,
      CASE WHEN COALESCE(total.cnt, 0) > 0 
        THEN ROUND((COALESCE(completed.cnt, 0)::NUMERIC / total.cnt) * 100)::INTEGER
        ELSE 0 
      END as completion_rate
    FROM admin_users u
    LEFT JOIN (
      SELECT assigned_to, COUNT(*) as cnt FROM store_tasks GROUP BY assigned_to
    ) total ON total.assigned_to = u.id
    LEFT JOIN (
      SELECT assigned_to, COUNT(*) as cnt FROM store_tasks WHERE status = 'done' GROUP BY assigned_to
    ) completed ON completed.assigned_to = u.id
    LEFT JOIN (
      SELECT assigned_to, COUNT(*) as cnt FROM store_tasks 
      WHERE status NOT IN ('done', 'canceled') AND due_date IS NOT NULL AND due_date < now()
      GROUP BY assigned_to
    ) overdue ON overdue.assigned_to = u.id
    LEFT JOIN (
      SELECT assigned_to, COUNT(*) as cnt FROM store_tasks 
      WHERE status = 'done' AND updated_at >= week_ago
      GROUP BY assigned_to
    ) week_done ON week_done.assigned_to = u.id
    WHERE u.is_active = true
    ORDER BY COALESCE(week_done.cnt, 0) DESC
  ) t;
  
  RETURN COALESCE(result, '[]'::JSON);
END;
$$;

-- =====================================================
-- 4. RPC: get_store_tasks_counts
--    يرجع عدد المهام لكل متجر — يتحقق من وجود store_tasks
-- =====================================================

CREATE OR REPLACE FUNCTION get_store_tasks_counts()
RETURNS JSON
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result JSON;
  has_store_tasks BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_tasks') INTO has_store_tasks;

  IF NOT has_store_tasks THEN
    SELECT json_agg(row_to_json(t)) INTO result
    FROM (
      SELECT id as store_id, store_url, is_active, 0 as open_tasks, 0 as overdue_tasks
      FROM stores ORDER BY created_at DESC
    ) t;
    RETURN COALESCE(result, '[]'::JSON);
  END IF;

  SELECT json_agg(row_to_json(t)) INTO result
  FROM (
    SELECT 
      s.id as store_id, s.store_url, s.is_active,
      COALESCE(open_t.cnt, 0) as open_tasks,
      COALESCE(overdue_t.cnt, 0) as overdue_tasks
    FROM stores s
    LEFT JOIN (
      SELECT store_id, COUNT(*) as cnt FROM store_tasks 
      WHERE status NOT IN ('done', 'canceled') GROUP BY store_id
    ) open_t ON open_t.store_id = s.id
    LEFT JOIN (
      SELECT store_id, COUNT(*) as cnt FROM store_tasks 
      WHERE status NOT IN ('done', 'canceled') AND due_date IS NOT NULL AND due_date < now()
      GROUP BY store_id
    ) overdue_t ON overdue_t.store_id = s.id
    ORDER BY COALESCE(overdue_t.cnt, 0) DESC
  ) t;
  
  RETURN COALESCE(result, '[]'::JSON);
END;
$$;
