// =====================================================
// TikTok Ads Integration - Types
// =====================================================

// اتصال TikTok مطابق لجدول tiktok_connections
export interface TikTokConnection {
  id: string;
  store_id: string;
  app_id: string;
  advertiser_id: string;
  advertiser_name?: string;
  access_token: string;
  is_active: boolean;
  connected_at: string;
  updated_at: string;
}

// استجابة TikTok API العامة
export interface TikTokApiResponse<T> {
  code: number;
  message: string;
  request_id: string;
  data: T;
}

// استجابة التوكن
export interface TikTokTokenResponse {
  access_token: string;
  refresh_token?: string;
  advertiser_ids: string[];
  scope: string[];
}

// معلومات المعلن
export interface TikTokAdvertiserInfo {
  advertiser_id: string;
  advertiser_name: string;
  company: string;
  status: string;
  currency: string;
  timezone: string;
  balance: number;
}

// حملة TikTok
export interface TikTokCampaign {
  campaign_id: string;
  campaign_name: string;
  advertiser_id: string;
  objective_type: string;
  budget: number;
  budget_mode: string;
  operation_status: string;
  status: string;
  create_time: string;
  modify_time: string;
}

// مجموعة إعلانية
export interface TikTokAdGroup {
  adgroup_id: string;
  adgroup_name: string;
  campaign_id: string;
  advertiser_id: string;
  budget: number;
  status: string;
  operation_status: string;
}

// إعلان
export interface TikTokAd {
  ad_id: string;
  ad_name: string;
  adgroup_id: string;
  campaign_id: string;
  advertiser_id: string;
  ad_text: string;
  video_id: string;
  status: string;
  operation_status: string;
}

// مقاييس التقرير
export interface TikTokReportMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  reach: number;
  conversions: number;
  cost_per_conversion: number;
  conversion_rate: number;
  complete_payment: number;
  cost_per_complete_payment: number;
  complete_payment_rate: number;
}

// صف التقرير
export interface TikTokReportRow {
  dimensions: {
    campaign_id: string;
    stat_time_day?: string;
  };
  metrics: Partial<TikTokReportMetrics>;
}

// معلومات الصفحة
export interface TikTokPageInfo {
  page: number;
  page_size: number;
  total_page: number;
  total_number: number;
}

// حالة الاتصال
export interface TikTokConnectionStatus {
  connected: boolean;
  advertiser_id?: string;
  advertiser_name?: string;
  connected_at?: string;
}
