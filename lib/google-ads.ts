// =====================================================
// Google Ads API Helper - lib/google-ads.ts
// =====================================================

import type {
  GoogleAdsConnection,
  GoogleAdsCustomer,
  GoogleAdsCampaign,
  GoogleAdsAdGroup,
  GoogleAdsReportRow,
} from '@/types/google-ads';

const GOOGLE_ADS_BASE = 'https://googleads.googleapis.com/v18';
const TOKEN_URL = 'https://www.googleapis.com/oauth2/v3/token';

// ─── Access Token Cache ───────────────────────────────────────────────────────
interface TokenCache {
  token: string;
  expiresAt: number;
}
const tokenCache = new Map<string, TokenCache>();

export async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const cacheKey = `${clientId}:${refreshToken.slice(-8)}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.token;
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google OAuth token error: ${err}`);
  }

  const data = await res.json();
  tokenCache.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });

  return data.access_token;
}

// ─── Build Headers ────────────────────────────────────────────────────────────
async function buildHeaders(conn: GoogleAdsConnection): Promise<Record<string, string>> {
  const accessToken = await getAccessToken(conn.client_id, conn.client_secret, conn.refresh_token);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': conn.developer_token,
    'Content-Type': 'application/json',
  };
  if (conn.manager_id) {
    headers['login-customer-id'] = conn.manager_id;
  }
  return headers;
}

// ─── GAQL Query via searchStream ─────────────────────────────────────────────
export async function googleAdsQuery(
  connection: GoogleAdsConnection,
  query: string
): Promise<GoogleAdsReportRow[]> {
  const headers = await buildHeaders(connection);
  const url = `${GOOGLE_ADS_BASE}/customers/${connection.customer_id}/googleAds:searchStream`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Ads query error (${res.status}): ${err}`);
  }

  const batches = await res.json();
  const allResults: GoogleAdsReportRow[] = [];

  if (Array.isArray(batches)) {
    for (const batch of batches) {
      if (batch.results && Array.isArray(batch.results)) {
        allResults.push(...batch.results);
      }
    }
  } else if (batches.results) {
    allResults.push(...batches.results);
  }

  return allResults;
}

// ─── Mutate ───────────────────────────────────────────────────────────────────
export async function googleAdsMutate(
  connection: GoogleAdsConnection,
  operations: any[]
): Promise<any> {
  const headers = await buildHeaders(connection);
  const url = `${GOOGLE_ADS_BASE}/customers/${connection.customer_id}/googleAds:mutate`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ mutateOperations: operations }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Ads mutate error (${res.status}): ${err}`);
  }

  return res.json();
}

// ─── List Accessible Customers ────────────────────────────────────────────────
export async function listAccessibleCustomers(
  connection: GoogleAdsConnection
): Promise<string[]> {
  const headers = await buildHeaders(connection);
  const url = `${GOOGLE_ADS_BASE}/customers:listAccessibleCustomers`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`listAccessibleCustomers error: ${err}`);
  }

  const data = await res.json();
  const resourceNames: string[] = data.resourceNames ?? [];
  return resourceNames.map((r: string) => r.replace('customers/', ''));
}

// ─── Get Customer Info ────────────────────────────────────────────────────────
export async function getCustomerInfo(
  connection: GoogleAdsConnection
): Promise<GoogleAdsCustomer | null> {
  try {
    const rows = await googleAdsQuery(
      connection,
      'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone FROM customer LIMIT 1'
    );
    if (!rows.length) return null;
    const c = (rows[0] as any).customer;
    return {
      resourceName: c.resourceName ?? '',
      id: String(c.id ?? ''),
      descriptiveName: c.descriptiveName ?? '',
      currencyCode: c.currencyCode ?? '',
      timeZone: c.timeZone ?? '',
    };
  } catch {
    return null;
  }
}

// ─── Get Campaigns ────────────────────────────────────────────────────────────
export async function getCampaigns(
  connection: GoogleAdsConnection
): Promise<GoogleAdsCampaign[]> {
  const rows = await googleAdsQuery(
    connection,
    `SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.bidding_strategy_type,
      campaign.start_date,
      campaign.end_date,
      campaign_budget.amount_micros
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.name`
  );

  return rows.map((r: any) => ({
    resourceName: r.campaign?.resourceName ?? '',
    id: String(r.campaign?.id ?? ''),
    name: r.campaign?.name ?? '',
    status: r.campaign?.status ?? 'PAUSED',
    advertisingChannelType: r.campaign?.advertisingChannelType ?? '',
    biddingStrategyType: r.campaign?.biddingStrategyType ?? '',
    startDate: r.campaign?.startDate ?? '',
    endDate: r.campaign?.endDate ?? '',
    budgetAmountMicros: r.campaignBudget?.amountMicros ?? '0',
  })) as any;
}

// ─── Get Campaign Report (by date) ───────────────────────────────────────────
export async function getCampaignReport(
  connection: GoogleAdsConnection,
  startDate: string,
  endDate: string
): Promise<GoogleAdsReportRow[]> {
  return googleAdsQuery(
    connection,
    `SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions,
      metrics.cost_per_conversion,
      metrics.all_conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status != 'REMOVED'
    ORDER BY segments.date DESC, campaign.name`
  );
}

// ─── Get Campaign Summary (no date segments) ──────────────────────────────────
export async function getCampaignSummary(
  connection: GoogleAdsConnection,
  startDate: string,
  endDate: string
): Promise<GoogleAdsReportRow[]> {
  return googleAdsQuery(
    connection,
    `SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions,
      metrics.cost_per_conversion
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC`
  );
}

// ─── Get Ad Groups ────────────────────────────────────────────────────────────
export async function getAdGroups(
  connection: GoogleAdsConnection,
  campaignId?: string
): Promise<GoogleAdsAdGroup[]> {
  const campaignFilter = campaignId ? `AND campaign.id = ${campaignId}` : '';
  const rows = await googleAdsQuery(
    connection,
    `SELECT
      ad_group.id,
      ad_group.name,
      ad_group.campaign,
      ad_group.status,
      ad_group.cpc_bid_micros
    FROM ad_group
    WHERE ad_group.status != 'REMOVED'
    ${campaignFilter}`
  );

  return rows.map((r: any) => ({
    resourceName: r.adGroup?.resourceName ?? '',
    id: String(r.adGroup?.id ?? ''),
    name: r.adGroup?.name ?? '',
    campaignId: String(r.adGroup?.campaign ?? '').replace(/.*\//, ''),
    status: r.adGroup?.status ?? '',
    cpcBidMicros: String(r.adGroup?.cpcBidMicros ?? '0'),
  }));
}

// ─── Create Campaign ──────────────────────────────────────────────────────────
export async function createCampaign(
  connection: GoogleAdsConnection,
  name: string,
  channelType: string,
  budgetMicros: number,
  status: 'ENABLED' | 'PAUSED' = 'PAUSED'
): Promise<any> {
  const operations = [
    {
      campaignBudgetOperation: {
        create: {
          resourceName: `customers/${connection.customer_id}/campaignBudgets/-1`,
          amountMicros: budgetMicros,
          deliveryMethod: 'STANDARD',
        },
      },
    },
    {
      campaignOperation: {
        create: {
          name,
          status,
          advertisingChannelType: channelType,
          campaignBudget: `customers/${connection.customer_id}/campaignBudgets/-1`,
          manualCpc: {},
        },
      },
    },
  ];
  return googleAdsMutate(connection, operations);
}

// ─── Update Campaign Status ───────────────────────────────────────────────────
export async function updateCampaignStatus(
  connection: GoogleAdsConnection,
  campaignResourceName: string,
  newStatus: 'ENABLED' | 'PAUSED'
): Promise<any> {
  const operations = [
    {
      campaignOperation: {
        update: { resourceName: campaignResourceName, status: newStatus },
        updateMask: 'status',
      },
    },
  ];
  return googleAdsMutate(connection, operations);
}

// ─── Micros Helpers ───────────────────────────────────────────────────────────
export function microsToAmount(micros: string | number): number {
  return Math.round(Number(micros) / 1_000_000 * 100) / 100;
}

export function amountToMicros(amount: number): number {
  return Math.round(amount * 1_000_000);
}

// ─── Validate Connection ──────────────────────────────────────────────────────
export async function validateConnection(
  connection: GoogleAdsConnection
): Promise<boolean> {
  try {
    // نحاول الحصول على access token فقط — إذا نجح فالـ credentials صحيحة
    await getAccessToken(connection.client_id, connection.client_secret, connection.refresh_token);
    return true;
  } catch {
    return false;
  }
}
