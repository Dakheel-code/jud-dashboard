/**
 * Snapchat Ads Marketing API Integration Adapter
 */

const SNAPCHAT_AUTH_URL = 'https://accounts.snapchat.com/login/oauth2/authorize';
const SNAPCHAT_TOKEN_URL = 'https://accounts.snapchat.com/login/oauth2/access_token';
const SNAPCHAT_API_URL = 'https://adsapi.snapchat.com/v1';

interface SnapchatTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface SnapchatAdAccount {
  id: string;
  name: string;
  type: string;
  status: string;
  currency: string;
  timezone: string;
  organization_id: string;
}

interface SnapchatOrganization {
  id: string;
  name: string;
  ad_accounts?: SnapchatAdAccount[];
}

/**
 * بناء رابط التفويض OAuth
 */
export function getAuthUrl({
  redirectUri,
  state,
  clientId,
}: {
  redirectUri: string;
  state: string;
  clientId: string;
}): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'snapchat-marketing-api',
    state: state,
  });

  return `${SNAPCHAT_AUTH_URL}?${params.toString()}`;
}

/**
 * استبدال الكود بالتوكنات
 */
export async function exchangeCodeForToken({
  code,
  redirectUri,
  clientId,
  clientSecret,
}: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<SnapchatTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(SNAPCHAT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Snapchat token exchange error:', errorText);
    throw new Error(`Failed to exchange code for token: ${response.status}`);
  }

  return response.json();
}

/**
 * تجديد التوكن
 */
export async function refreshToken({
  refreshToken,
  clientId,
  clientSecret,
}: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<SnapchatTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(SNAPCHAT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Snapchat token refresh error:', errorText);
    throw new Error(`Failed to refresh token: ${response.status}`);
  }

  return response.json();
}

/**
 * جلب المنظمات والحسابات الإعلانية
 */
export async function listAdAccounts({
  accessToken,
}: {
  accessToken: string;
}): Promise<{ organizations: SnapchatOrganization[]; adAccounts: SnapchatAdAccount[] }> {
  const response = await fetch(`${SNAPCHAT_API_URL}/me/organizations?with_ad_accounts=true`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Snapchat list organizations error:', errorText);
    throw new Error(`Failed to list organizations: ${response.status}`);
  }

  const data = await response.json();
  const organizations: SnapchatOrganization[] = data.organizations?.map((org: any) => ({
    id: org.organization?.id,
    name: org.organization?.name,
    ad_accounts: org.organization?.ad_accounts?.map((acc: any) => ({
      id: acc.ad_account?.id,
      name: acc.ad_account?.name,
      type: acc.ad_account?.type,
      status: acc.ad_account?.status,
      currency: acc.ad_account?.currency,
      timezone: acc.ad_account?.timezone,
      organization_id: org.organization?.id,
    })),
  })) || [];

  // تجميع كل الحسابات الإعلانية من جميع المنظمات
  const adAccounts: SnapchatAdAccount[] = [];
  organizations.forEach((org) => {
    if (org.ad_accounts) {
      adAccounts.push(...org.ad_accounts);
    }
  });

  return { organizations, adAccounts };
}

/**
 * جلب معلومات المستخدم
 */
export async function getUserInfo({
  accessToken,
}: {
  accessToken: string;
}): Promise<{ id: string; display_name: string; email: string }> {
  const response = await fetch(`${SNAPCHAT_API_URL}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Snapchat get user info error:', errorText);
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.me?.id,
    display_name: data.me?.display_name,
    email: data.me?.email,
  };
}
