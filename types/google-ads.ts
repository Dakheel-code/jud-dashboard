// =====================================================
// Google Ads Integration - TypeScript Types
// =====================================================

export interface GoogleAdsConnection {
  id: string;
  store_id: string;
  customer_id: string;
  customer_name: string | null;
  manager_id: string | null;
  client_id: string;
  client_secret: string;
  refresh_token: string;
  developer_token: string;
  is_active: boolean;
  connected_at: string;
  updated_at: string;
}

export interface GoogleAdsTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface GoogleAdsCustomer {
  resourceName: string;
  id: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
}

export interface GoogleAdsCampaign {
  resourceName: string;
  id: string;
  name: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  advertisingChannelType: string;
  biddingStrategyType: string;
  startDate: string;
  endDate: string;
}

export interface GoogleAdsCampaignBudget {
  resourceName: string;
  amountMicros: string;
  deliveryMethod: string;
}

export interface GoogleAdsAdGroup {
  resourceName: string;
  id: string;
  name: string;
  campaignId: string;
  status: string;
  cpcBidMicros: string;
}

export interface GoogleAdsAd {
  resourceName: string;
  id: string;
  name: string;
  adGroupId: string;
  type: string;
  finalUrls: string[];
  status: string;
}

export interface GoogleAdsMetrics {
  impressions: string;
  clicks: string;
  ctr: string;
  averageCpc: string;
  costMicros: string;
  conversions: string;
  costPerConversion: string;
  conversionsValue: string;
  allConversions: string;
  interactionRate: string;
}

export interface GoogleAdsReportRow {
  campaign: Partial<GoogleAdsCampaign>;
  campaignBudget: Partial<GoogleAdsCampaignBudget>;
  metrics: Partial<GoogleAdsMetrics>;
  segments: { date?: string; device?: string };
}

export interface GoogleAdsSearchResponse {
  results: GoogleAdsReportRow[];
  totalResultsCount: string;
  nextPageToken?: string;
}

export interface GoogleAdsConnectionStatus {
  connected: boolean;
  customer_id?: string;
  customer_name?: string;
  connected_at?: string;
}
