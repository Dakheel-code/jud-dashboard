-- إضافة UNIQUE constraint على store_id في store_meta_connections
-- مطلوب لكي يعمل upsert بشكل صحيح
ALTER TABLE store_meta_connections
  ADD CONSTRAINT store_meta_connections_store_id_key UNIQUE (store_id);
