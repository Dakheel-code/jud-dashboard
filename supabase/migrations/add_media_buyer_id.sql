-- إضافة عمود media_buyer_id للمتاجر
ALTER TABLE stores ADD COLUMN IF NOT EXISTS media_buyer_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;

-- إنشاء index للبحث
CREATE INDEX IF NOT EXISTS idx_stores_media_buyer ON stores(media_buyer_id);
