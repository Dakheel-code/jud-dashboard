-- =====================================================
-- PHASE 3: RBAC Mapping — ربط صلاحيات لكل Role
-- نفّذ هذا الملف في Supabase SQL Editor بعد Phase 2
-- =====================================================

with r as (
  select id, key from public.admin_roles
),
p as (
  select id, key from public.admin_permissions
)
insert into public.admin_role_permissions (role_id, permission_id)
select
  r.id,
  p.id
from r
join p on (
  -- Viewer
  (r.key='viewer' and p.key in ('dashboard.read','users.read')) or
  -- Editor
  (r.key='editor' and p.key in ('dashboard.read','users.read','settings.read','settings.write')) or
  -- Manager
  (r.key='manager' and p.key in ('dashboard.read','users.read','users.write','roles.read','audit.read','settings.read','settings.write')) or
  -- Super Admin (كل شيء)
  (r.key='super_admin')
)
on conflict do nothing;
