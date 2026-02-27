-- إضافة حقول الاستبيان التفصيلي لطلبات التصاميم
alter table creative_requests
  add column if not exists campaign_goals       text[],
  add column if not exists campaign_goals_other text,
  add column if not exists has_offer            text,
  add column if not exists target_audience      text,
  add column if not exists content_tone         text,
  add column if not exists brand_colors         text,
  add column if not exists brand_fonts          text,
  add column if not exists discount_code        text,
  add column if not exists current_discounts    text,
  add column if not exists free_shipping        text,
  add column if not exists product_links        text,
  add column if not exists ad_examples_urls     text[],
  add column if not exists font_files_urls      text[],
  add column if not exists logo_files_urls      text[],
  add column if not exists brand_guide_urls     text[],
  add column if not exists product_media_links  text;
