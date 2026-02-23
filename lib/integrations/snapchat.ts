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
  forceLogin = false,
}: {
  redirectUri: string;
  state: string;
  clientId: string;
  forceLogin?: boolean;
}): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'snapchat-marketing-api',
    state: state,
  });

  // إجبار تسجيل دخول جديد عند إعادة الربط
  if (forceLogin) {
    params.set('prompt', 'login');
  }

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
    console.error('[Snapchat refreshToken] failed:', response.status, errorText);
    throw new Error(`Failed to refresh token: ${response.status} - ${errorText}`);
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
    throw new Error(`Failed to list organizations: ${response.status}`);
  }

  const data = await response.json();
  
  const organizations: SnapchatOrganization[] = [];
  const adAccounts: SnapchatAdAccount[] = [];
  
  // معالجة البيانات بشكل مرن
  if (data.organizations && Array.isArray(data.organizations)) {
    data.organizations.forEach((orgWrapper: any) => {
      const org = orgWrapper.organization || orgWrapper;
      
      const orgData: SnapchatOrganization = {
        id: org?.id || '',
        name: org?.name || '',
        ad_accounts: [],
      };
      
      // جلب الحسابات الإعلانية من المنظمة
      const accounts = org?.ad_accounts || orgWrapper?.ad_accounts || [];
      if (Array.isArray(accounts)) {
        accounts.forEach((accWrapper: any) => {
          const acc = accWrapper.ad_account || accWrapper;
          
          const adAccount: SnapchatAdAccount = {
            id: acc?.id || '',
            name: acc?.name || '',
            type: acc?.type || '',
            status: acc?.status || '',
            currency: acc?.currency || '',
            timezone: acc?.timezone || '',
            organization_id: org?.id || '',
          };
          
          if (adAccount.id) {
            adAccounts.push(adAccount);
            orgData.ad_accounts?.push(adAccount);
          }
        });
      }
      
      organizations.push(orgData);
    });
  }
  

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
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  const data = await response.json();
  return {
    id: data.me?.id,
    display_name: data.me?.display_name,
    email: data.me?.email,
  };
}
