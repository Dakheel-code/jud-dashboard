-- ═══════════════════════════════════════════════════════════════
-- جدول سجل رواتب الموظفين الشهرية
-- ═══════════════════════════════════════════════════════════════

do $$ begin
  create type salary_status as enum ('pending','approved','paid','canceled');
exception when duplicate_object then null; end $$;

create table if not exists public.employee_salaries (
  id              uuid          primary key default gen_random_uuid(),
  employee_id     uuid          not null references public.admin_users(id) on delete restrict,
  period          text          not null,           -- 'YYYY-MM'
  base_salary     numeric(12,2) not null default 0, -- الراتب الأساسي وقت التوليد
  deductions      numeric(12,2) not null default 0, -- الخصومات
  additions       numeric(12,2) not null default 0, -- الإضافات (مكافآت يدوية)
  net_salary      numeric(12,2) not null default 0, -- الصافي = base - deductions + additions
  status          salary_status not null default 'pending',
  notes           text,
  created_at      timestamptz   not null default now(),
  approved_at     timestamptz,
  paid_at         timestamptz,
  constraint employee_salaries_unique unique (employee_id, period)
);

create index if not exists idx_employee_salaries_employee on public.employee_salaries(employee_id);
create index if not exists idx_employee_salaries_period   on public.employee_salaries(period);
create index if not exists idx_employee_salaries_status   on public.employee_salaries(status);
