-- جدول تعليقات الطلبات
create table if not exists request_comments (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references creative_requests(id) on delete cascade,
  body         text,
  author_name  text not null default 'العميل',
  author_role  text not null default 'client', -- 'client' | 'designer' | 'admin'
  file_urls    text[] default '{}',
  created_at   timestamptz default now()
);

create index if not exists idx_request_comments_request_id on request_comments(request_id);

alter table request_comments enable row level security;

-- السماح للجميع بالقراءة والكتابة (الصفحة العامة بدون auth)
create policy "public_read_comments"  on request_comments for select using (true);
create policy "public_insert_comments" on request_comments for insert with check (true);
