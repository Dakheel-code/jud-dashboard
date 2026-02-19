/**
 * Meta Graph API Client
 */

export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v19.0';
export const META_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export const META_APP_ID       = process.env.META_APP_ID!;
export const META_APP_SECRET   = process.env.META_APP_SECRET!;
export const META_REDIRECT_URI =
  process.env.META_REDIRECT_URI ||
  'https://jud-dashboard.netlify.app/api/meta/callback';

export const META_SCOPES = ['ads_read', 'ads_management', 'business_management'].join(',');

/** بناء رابط OAuth Dialog */
export function buildOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     META_APP_ID,
    redirect_uri:  META_REDIRECT_URI,
    scope:         META_SCOPES,
    response_type: 'code',
    state,
  });
  return `https://www.facebook.com/dialog/oauth?${params.toString()}`;
}

/** استبدال code بـ short-lived token — redirect_uri يجب أن يطابق Meta Dashboard حرفياً */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string = META_REDIRECT_URI
): Promise<{ access_token: string; token_type: string }> {
  const params = new URLSearchParams({
    client_id:     META_APP_ID,
    client_secret: META_APP_SECRET,
    redirect_uri:  redirectUri,
    code,
  });
  const res  = await fetch(`${META_BASE}/oauth/access_token?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`token_exchange_failed: ${JSON.stringify(data)}`);
  }
  return data;
}

/** تحويل short-lived → long-lived token (60 يوم) */
export async function exchangeForLongLivedToken(shortToken: string): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type:        'fb_exchange_token',
    client_id:         META_APP_ID,
    client_secret:     META_APP_SECRET,
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${META_BASE}/oauth/access_token?${params.toString()}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

/** جلب معلومات المستخدم */
export async function getMetaUser(token: string): Promise<{ id: string; name: string }> {
  const res = await fetch(`${META_BASE}/me?fields=id,name&access_token=${token}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

/** جلب حسابات الإعلانات */
export async function getAdAccounts(token: string): Promise<Array<{
  id: string; name: string; account_status: number; currency: string; timezone_name: string;
}>> {
  const res = await fetch(
    `${META_BASE}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

/** جلب الإعلانات من حساب إعلاني */
export async function fetchAds(adAccountId: string, token: string): Promise<any[]> {
  const fields = 'id,name,status,effective_status,adset{id,name},campaign{id,name},creative{thumbnail_url}';
  const url = `${META_BASE}/${adAccountId}/ads?fields=${fields}&limit=500&access_token=${token}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

/** جلب Insights */
export async function fetchInsights(
  adAccountId: string,
  token: string,
  datePreset: string = 'last_7d'
): Promise<any[]> {
  const fields = 'ad_id,campaign_id,date_start,date_stop,spend,impressions,clicks,reach,ctr,cpc,cpm,conversions,cost_per_conversion';
  const url = `${META_BASE}/${adAccountId}/insights?fields=${fields}&date_preset=${datePreset}&level=ad&limit=500&access_token=${token}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}
