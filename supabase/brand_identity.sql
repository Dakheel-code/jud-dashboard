-- جدول هوية المتجر
create table if not exists public.brand_identity (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null unique references public.stores(id) on delete cascade,
  logo_urls      text[] not null default '{}',
  guideline_urls text[] not null default '{}',
  brand_colors   text,
  fonts          text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- سماح القراءة والكتابة العامة (صفحة التاجر بدون auth)
alter table public.brand_identity enable row level security;

create policy "public read brand_identity"
  on public.brand_identity for select
  using (true);

create policy "public upsert brand_identity"
  on public.brand_identity for insert
  with check (true);

create policy "public update brand_identity"
  on public.brand_identity for update
  using (true);
