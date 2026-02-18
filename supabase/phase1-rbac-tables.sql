-- =====================================================
-- PHASE 1: RBAC Tables — جداول الصلاحيات الجديدة
-- نفّذ هذا الملف في Supabase SQL Editor
-- =====================================================

-- 1) Roles
create table if not exists public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,              -- e.g. "viewer", "editor", "manager", "super_admin"
  name text not null,                    -- Arabic/English friendly label
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Permissions
create table if not exists public.admin_permissions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,              -- e.g. "users.read", "users.write"
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Role -> Permissions (many-to-many)
create table if not exists public.admin_role_permissions (
  role_id uuid not null references public.admin_roles(id) on delete cascade,
  permission_id uuid not null references public.admin_permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

-- 4) User -> Roles (many-to-many)
create table if not exists public.admin_user_roles (
  user_id uuid not null references public.admin_users(id) on delete cascade,
  role_id uuid not null references public.admin_roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

-- 5) Optional: direct user permissions overrides
create table if not exists public.admin_user_permissions (
  user_id uuid not null references public.admin_users(id) on delete cascade,
  permission_id uuid not null references public.admin_permissions(id) on delete cascade,
  mode text not null check (mode in ('grant','deny')), -- deny beats grant
  created_at timestamptz not null default now(),
  primary key (user_id, permission_id)
);

-- 6) Activity / Audit logs
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.admin_users(id) on delete set null,
  action text not null,                  -- e.g. "auth.login", "users.update"
  entity text,                           -- e.g. "admin_users"
  entity_id text,
  meta jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- 7) Trigger updated_at helper
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_roles_updated_at on public.admin_roles;
create trigger trg_roles_updated_at
before update on public.admin_roles
for each row execute function public.set_updated_at();

drop trigger if exists trg_perms_updated_at on public.admin_permissions;
create trigger trg_perms_updated_at
before update on public.admin_permissions
for each row execute function public.set_updated_at();
