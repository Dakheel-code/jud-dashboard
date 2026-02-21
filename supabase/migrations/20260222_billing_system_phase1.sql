-- ═══════════════════════════════════════════════════════════════
-- Phase 1: نظام الفوترة والعمولات والبونص
-- شغّل هذا الملف مرة واحدة فقط في Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1) Enum types
do $$ begin
  create type invoice_status as enum ('unpaid','partial','paid','void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payout_status as enum ('pending','approved','paid','canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type assignment_role as enum ('account_manager','media_buyer','sales','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rule_apply_to as enum ('invoice_paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rule_rate_type as enum ('percentage','fixed');
exception when duplicate_object then null; end $$;

-- ═══════════════════════════════════════════════════════════════
-- 2) store_invoices (فواتير المتاجر)
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.store_invoices (
  id             uuid          primary key default gen_random_uuid(),
  store_id       uuid          not null references public.stores(id) on delete cascade,
  period         text          not null,                          -- 'YYYY-MM'
  invoice_number text,
  amount         numeric(12,2) not null default 0,
  vat_amount     numeric(12,2) not null default 0,
  total_amount   numeric(12,2) not null default 0,
  status         invoice_status not null default 'unpaid',
  issue_date     date          not null,
  due_date       date,
  paid_at        timestamptz,
  created_at     timestamptz   not null default now(),
  notes          text,
  constraint store_invoices_unique_period unique (store_id, period)
);

create index if not exists idx_store_invoices_store  on public.store_invoices(store_id);
create index if not exists idx_store_invoices_period on public.store_invoices(period);
create index if not exists idx_store_invoices_status on public.store_invoices(status);

-- ═══════════════════════════════════════════════════════════════
-- 3) store_assignments (ربط الموظفين بالمتاجر حسب الدور)
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.store_assignments (
  id          uuid            primary key default gen_random_uuid(),
  store_id    uuid            not null references public.stores(id) on delete cascade,
  employee_id uuid            not null references public.admin_users(id) on delete restrict,
  role        assignment_role not null,
  start_date  date            not null default current_date,
  end_date    date,
  active      boolean         not null default true,
  created_at  timestamptz     not null default now()
);

create index if not exists idx_store_assignments_store    on public.store_assignments(store_id);
create index if not exists idx_store_assignments_employee on public.store_assignments(employee_id);

-- ═══════════════════════════════════════════════════════════════
-- 4) commission_rules (قواعد العمولات)
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.commission_rules (
  id               uuid            primary key default gen_random_uuid(),
  name             text            not null,
  applies_to       rule_apply_to   not null default 'invoice_paid',
  applies_to_role  assignment_role not null,
  rate_type        rule_rate_type  not null,
  rate_value       numeric(12,4)   not null,   -- لو نسبة: 5 = 5%
  min_amount       numeric(12,2),
  max_amount       numeric(12,2),
  active           boolean         not null default true,
  created_at       timestamptz     not null default now()
);

-- ═══════════════════════════════════════════════════════════════
-- 5) employee_commissions (سجل العمولات الفعلي)
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.employee_commissions (
  id                uuid          primary key default gen_random_uuid(),
  employee_id       uuid          not null references public.admin_users(id) on delete restrict,
  store_id          uuid          not null references public.stores(id) on delete cascade,
  invoice_id        uuid          not null references public.store_invoices(id) on delete cascade,
  period            text          not null,   -- 'YYYY-MM'
  base_amount       numeric(12,2) not null,
  commission_amount numeric(12,2) not null,
  status            payout_status not null default 'pending',
  created_at        timestamptz   not null default now(),
  paid_at           timestamptz,
  notes             text,
  constraint employee_commissions_unique unique (employee_id, invoice_id)
);

create index if not exists idx_employee_commissions_period   on public.employee_commissions(period);
create index if not exists idx_employee_commissions_employee on public.employee_commissions(employee_id);

-- ═══════════════════════════════════════════════════════════════
-- 6) bonus_rules (قواعد البونص)
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.bonus_rules (
  id               uuid            primary key default gen_random_uuid(),
  name             text            not null,
  applies_to_role  assignment_role not null,
  rate_type        rule_rate_type  not null,
  rate_value       numeric(12,4)   not null,
  period_type      text            not null default 'monthly',  -- monthly/quarterly/yearly
  active           boolean         not null default true,
  created_at       timestamptz     not null default now()
);

-- ═══════════════════════════════════════════════════════════════
-- 7) employee_bonuses (سجل بونص الموظف)
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.employee_bonuses (
  id          uuid          primary key default gen_random_uuid(),
  employee_id uuid          not null references public.admin_users(id) on delete restrict,
  period      text          not null,   -- 'YYYY-MM'
  rule_id     uuid          references public.bonus_rules(id) on delete set null,
  base_value  numeric(12,2) not null default 0,
  bonus_amount numeric(12,2) not null,
  status      payout_status not null default 'pending',
  created_at  timestamptz   not null default now(),
  paid_at     timestamptz,
  notes       text,
  constraint employee_bonuses_unique unique (employee_id, period, rule_id)
);

create index if not exists idx_employee_bonuses_employee on public.employee_bonuses(employee_id);
create index if not exists idx_employee_bonuses_period   on public.employee_bonuses(period);

-- ═══════════════════════════════════════════════════════════════
-- 8) Trigger: توليد العمولات تلقائياً عند دفع الفاتورة
-- ═══════════════════════════════════════════════════════════════
create or replace function public.generate_commissions_on_invoice_paid()
returns trigger
language plpgsql
as $$
declare
  r    record;
  a    record;
  base numeric(12,2);
  amt  numeric(12,2);
begin
  if (tg_op = 'UPDATE') then
    if (old.status is distinct from new.status) and new.status = 'paid' then
      base := new.total_amount;

      -- امسح أي عمولات قديمة لنفس الفاتورة (احتياط)
      delete from public.employee_commissions where invoice_id = new.id;

      -- لكل assignment نشط للمتجر
      for a in
        select * from public.store_assignments
        where store_id = new.store_id
          and active = true
          and (end_date is null or end_date >= new.issue_date)
      loop
        select * into r
        from public.commission_rules
        where active = true
          and applies_to_role = a.role
          and (min_amount is null or base >= min_amount)
          and (max_amount is null or base <= max_amount)
        order by created_at asc
        limit 1;

        if found then
          if r.rate_type = 'percentage' then
            amt := round((base * (r.rate_value / 100.0))::numeric, 2);
          else
            amt := round((r.rate_value)::numeric, 2);
          end if;

          insert into public.employee_commissions (
            employee_id, store_id, invoice_id, period,
            base_amount, commission_amount, status
          ) values (
            a.employee_id, new.store_id, new.id, new.period,
            base, amt, 'pending'
          );
        end if;
      end loop;

    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_generate_commissions_on_invoice_paid on public.store_invoices;

create trigger trg_generate_commissions_on_invoice_paid
after update of status on public.store_invoices
for each row
execute function public.generate_commissions_on_invoice_paid();
