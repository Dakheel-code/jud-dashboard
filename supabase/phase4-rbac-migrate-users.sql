-- =====================================================
-- PHASE 4: ترحيل المستخدمين الحاليين إلى RBAC
-- نفّذ هذا الملف في Supabase SQL Editor بعد Phase 3
-- =====================================================

-- 4.1 اجعل الكل Viewer افتراضيًا (أقل صلاحية)
insert into public.admin_user_roles (user_id, role_id)
select u.id, r.id
from public.admin_users u
join public.admin_roles r on r.key = 'viewer'
on conflict do nothing;

-- 4.2 ترقية أي مستخدم كان "super_admin" سابقًا
insert into public.admin_user_roles (user_id, role_id)
select u.id, r.id
from public.admin_users u
join public.admin_roles r on r.key = 'super_admin'
where u.role = 'super_admin'
on conflict do nothing;
