-- إنشاء bucket لملفات الطلبات
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-files',
  'request-files',
  true,
  52428800, -- 50MB
  null
)
on conflict (id) do nothing;

-- سياسة القراءة العامة
create policy "public read request-files"
  on storage.objects for select
  using ( bucket_id = 'request-files' );

-- سياسة الرفع بدون auth
create policy "public upload request-files"
  on storage.objects for insert
  with check ( bucket_id = 'request-files' );

-- سياسة الحذف بدون auth
create policy "public delete request-files"
  on storage.objects for delete
  using ( bucket_id = 'request-files' );
