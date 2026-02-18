-- =====================================================
-- PHASE 2: RBAC Seed — صلاحيات وأدوار افتراضية
-- نفّذ هذا الملف في Supabase SQL Editor بعد Phase 1
-- =====================================================

-- Permissions catalog
insert into public.admin_permissions (key, name, description) values
('dashboard.read', 'Dashboard Read', 'View dashboard'),
('users.read', 'Users Read', 'View users list/details'),
('users.write', 'Users Write', 'Create/update users'),
('users.delete', 'Users Delete', 'Delete users'),
('roles.read', 'Roles Read', 'View roles & permissions'),
('roles.write', 'Roles Write', 'Create/update roles & permissions'),
('audit.read', 'Audit Read', 'View audit logs'),
('settings.read', 'Settings Read', 'View settings'),
('settings.write', 'Settings Write', 'Update settings')
on conflict (key) do nothing;

-- Roles
insert into public.admin_roles (key, name, description, is_system) values
('viewer', 'Viewer', 'Read-only access', true),
('editor', 'Editor', 'Can edit content but not manage users', true),
('manager', 'Manager', 'Can manage users (no delete), roles read', true),
('super_admin', 'Super Admin', 'Full access', true)
on conflict (key) do nothing;
