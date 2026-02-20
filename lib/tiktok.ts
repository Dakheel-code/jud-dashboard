// =====================================================
// TikTok Marketing API Helper
// Base URL: https://business-api.tiktok.com/open_api/v1.3
// =====================================================

import type {
  TikTokApiResponse,
  TikTokTokenResponse,
  TikTokAdvertiserInfo,
  TikTokCampaign,
  TikTokAdGroup,
  TikTokAd,
  TikTokReportRow,
  TikTokPageInfo,
} from '@/types/tiktok';

const BASE_URL = 'https://business-api.tiktok.com/open_api/v1.3';

// ─── Config داخلي ────────────────────────────────────
function getConfig() {
  const appId = process.env.TIKTOK_APP_ID;
  const appSecret = process.env.TIKTOK_APP_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    throw new Error(
      'متغيرات TikTok ناقصة: TIKTOK_APP_ID, TIKTOK_APP_SECRET, TIKTOK_REDIRECT_URI'
    );
  }

  return { appId, appSecret, redirectUri };
}

// ─── بناء رابط OAuth ─────────────────────────────────
export function buildTikTokAuthUrl(storeId: string): string {
  const { appId, redirectUri } = getConfig();
  const params = new URLSearchParams({
    app_id: appId,
    redirect_uri: redirectUri,
    state: storeId,
  });
  return `https://business-api.tiktok.com/portal/auth?${params.toString()}`;
}

// ─── تبادل كود المصادقة بتوكن ────────────────────────
export async function exchangeAuthCode(
  authCode: string
): Promise<TikTokApiResponse<TikTokTokenResponse>> {
  const { appId, appSecret } = getConfig();

  const res = await fetch(`${BASE_URL}/oauth2/access_token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, secret: appSecret, auth_code: authCode }),
  });

  return res.json();
}

// ─── دالة API عامة داخلية ────────────────────────────
async function tiktokApiCall<T>(
  endpoint: string,
  accessToken: string,
  params?: Record<string, any>,
  method: 'GET' | 'POST' = 'GET'
): Promise<TikTokApiResponse<T>> {
  let url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Access-Token': accessToken,
    'Content-Type': 'application/json',
  };

  let body: string | undefined;

  if (method === 'GET' && params) {
    const qs = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    );
    url = `${url}?${qs.toString()}`;
  } else if (method === 'POST' && params) {
    body = JSON.stringify(params);
  }

  const res = await fetch(url, { method, headers, body });
  return res.json();
}

// ─── معلومات المعلنين ─────────────────────────────────
export async function getAdvertiserInfo(
  accessToken: string,
  advertiserIds: string[]
): Promise<TikTokApiResponse<{ list: TikTokAdvertiserInfo[] }>> {
  return tiktokApiCall(
    '/advertiser/info/',
    accessToken,
    { advertiser_ids: JSON.stringify(advertiserIds) }
  );
}

// ─── المعلنون المفوضون ────────────────────────────────
export async function getAuthorizedAdvertisers(
  accessToken: string
): Promise<TikTokApiResponse<{ list: { advertiser_id: string; advertiser_name: string }[] }>> {
  const { appId, appSecret } = getConfig();
  return tiktokApiCall(
    '/oauth2/advertiser/get/',
    accessToken,
    { app_id: appId, secret: appSecret }
  );
}

// ─── جلب الحملات ─────────────────────────────────────
export async function getCampaigns(
  accessToken: string,
  advertiserId: string,
  page = 1,
  pageSize = 100
): Promise<TikTokApiResponse<{ list: TikTokCampaign[]; page_info: TikTokPageInfo }>> {
  return tiktokApiCall(
    '/campaign/get/',
    accessToken,
    { advertiser_id: advertiserId, page, page_size: pageSize }
  );
}

// ─── إنشاء حملة ──────────────────────────────────────
export async function createCampaign(
  accessToken: string,
  advertiserId: string,
  campaignData: {
    campaign_name: string;
    objective_type: string;
    budget: number;
    budget_mode: string;
  }
): Promise<TikTokApiResponse<{ campaign_id: string }>> {
  return tiktokApiCall(
    '/campaign/create/',
    accessToken,
    { advertiser_id: advertiserId, ...campaignData },
    'POST'
  );
}

// ─── تحديث حالة الحملة ───────────────────────────────
export async function updateCampaignStatus(
  accessToken: string,
  advertiserId: string,
  campaignIds: string[],
  status: 'ENABLE' | 'DISABLE'
): Promise<TikTokApiResponse<any>> {
  return tiktokApiCall(
    '/campaign/status/update/',
    accessToken,
    { advertiser_id: advertiserId, campaign_ids: campaignIds, operation_status: status },
    'POST'
  );
}

// ─── جلب المجموعات الإعلانية ─────────────────────────
export async function getAdGroups(
  accessToken: string,
  advertiserId: string,
  campaignId?: string,
  page = 1,
  pageSize = 100
): Promise<TikTokApiResponse<{ list: TikTokAdGroup[]; page_info: TikTokPageInfo }>> {
  const params: Record<string, any> = { advertiser_id: advertiserId, page, page_size: pageSize };
  if (campaignId) params.campaign_ids = JSON.stringify([campaignId]);
  return tiktokApiCall('/adgroup/get/', accessToken, params);
}

// ─── جلب الإعلانات ───────────────────────────────────
export async function getAds(
  accessToken: string,
  advertiserId: string,
  adGroupId?: string,
  page = 1,
  pageSize = 100
): Promise<TikTokApiResponse<{ list: TikTokAd[]; page_info: TikTokPageInfo }>> {
  const params: Record<string, any> = { advertiser_id: advertiserId, page, page_size: pageSize };
  if (adGroupId) params.adgroup_ids = JSON.stringify([adGroupId]);
  return tiktokApiCall('/ad/get/', accessToken, params);
}

// ─── تقرير الحملات (مع تفصيل يومي) ──────────────────
export async function getCampaignReport(
  accessToken: string,
  advertiserId: string,
  startDate: string,
  endDate: string,
  campaignIds?: string[]
): Promise<TikTokApiResponse<{ list: TikTokReportRow[]; page_info: TikTokPageInfo }>> {
  const params: Record<string, any> = {
    advertiser_id: advertiserId,
    report_type: 'BASIC',
    data_level: 'AUCTION_CAMPAIGN',
    dimensions: JSON.stringify(['campaign_id', 'stat_time_day']),
    metrics: JSON.stringify([
      'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm',
      'reach', 'conversions', 'cost_per_conversion', 'conversion_rate',
    ]),
    start_date: startDate,
    end_date: endDate,
    page_size: 1000,
  };

  if (campaignIds && campaignIds.length > 0) {
    params.filtering = JSON.stringify([
      { field_name: 'campaign_ids', filter_type: 'IN', filter_value: JSON.stringify(campaignIds) },
    ]);
  }

  return tiktokApiCall('/report/integrated/get/', accessToken, params);
}

// ─── تقرير الحملات (إجمالي بدون تفصيل يومي) ─────────
export async function getCampaignSummaryReport(
  accessToken: string,
  advertiserId: string,
  startDate: string,
  endDate: string
): Promise<TikTokApiResponse<{ list: TikTokReportRow[]; page_info: TikTokPageInfo }>> {
  const params: Record<string, any> = {
    advertiser_id: advertiserId,
    report_type: 'BASIC',
    data_level: 'AUCTION_CAMPAIGN',
    dimensions: JSON.stringify(['campaign_id']),
    metrics: JSON.stringify([
      'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm',
      'reach', 'conversions', 'cost_per_conversion', 'conversion_rate',
    ]),
    start_date: startDate,
    end_date: endDate,
    page_size: 1000,
  };

  return tiktokApiCall('/report/integrated/get/', accessToken, params);
}

// ─── التحقق من صلاحية التوكن ─────────────────────────
export async function validateToken(accessToken: string): Promise<boolean> {
  try {
    const res = await getAuthorizedAdvertisers(accessToken);
    return res.code === 0;
  } catch {
    return false;
  }
}
