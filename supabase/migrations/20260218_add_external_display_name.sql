-- إضافة عمود external_display_name لحفظ اسم مستخدم Snapchat
ALTER TABLE ad_platform_accounts
  ADD COLUMN IF NOT EXISTS external_display_name TEXT;
