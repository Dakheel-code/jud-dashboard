/**
 * GET /api/integrations/snapchat/identities
 *
 * يرجع قائمة المنظمات (Organizations) من Snapchat API مباشرة
 * لكل سجل له refresh_token صالح — مجمّعة بـ organization_id
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

const SNAPCHAT_API_URL = 'https://adsapi.snapchat.com/v1';
const SNAPCHAT_TOKEN_URL = 'https://accounts.snapchat.com/login/oauth2/access_token';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration missing');
  return createClient(supabaseUrl, supabaseKey);
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.SNAPCHAT_CLIENT_ID!,
      client_secret: process.env.SNAPCHAT_CLIENT_SECRET!,
    });
    const res = await fetch(SNAPCHAT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

async function getValidToken(row: { access_token_enc: string | null; refresh_token_enc: string | null; token_expires_at: string | null }): Promise<string | null> {
  // تحقق إذا كان التوكن الحالي صالحاً
  if (row.access_token_enc && row.token_expires_at) {
    const expiresAt = new Date(row.token_expires_at);
    const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (expiresAt > fiveMinFromNow) {
      return decrypt(row.access_token_enc);
    }
  }
  // جدّد التوكن باستخدام refresh_token
  if (row.refresh_token_enc) {
    const refreshToken = decrypt(row.refresh_token_enc);
    return await refreshAccessToken(refreshToken);
  }
  return null;
}

async function getUserEmailFromToken(accessToken: string): Promise<{ email: string | null; orgId: string | null; orgName: string | null }> {
  try {
    const [meRes, orgRes] = await Promise.all([
      fetch(`${SNAPCHAT_API_URL}/me`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      fetch(`${SNAPCHAT_API_URL}/me/organizations?with_ad_accounts=true`, { headers: { Authorization: `Bearer ${accessToken}` } }),
    ]);

    let email: string | null = null;
    if (meRes.ok) {
      const meData = await meRes.json();
      email = meData.me?.email || meData.me?.display_name || null;
    }

    let orgId: string | null = null;
    let orgName: string | null = null;
    if (orgRes.ok) {
      const orgData = await orgRes.json();
      const orgs = orgData.organizations || [];
      if (orgs.length > 0) {
        const org = orgs[0]?.organization || orgs[0];
        orgId = org?.id || null;
        orgName = org?.name || null;
      }
    }

    return { email, orgId, orgName };
  } catch {
    return { email: null, orgId: null, orgName: null };
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // جلب كل سجلات Snapchat التي لديها refresh_token — distinct بـ store_id
    const { data, error } = await supabase
      .from('ad_platform_accounts')
      .select('store_id, access_token_enc, refresh_token_enc, token_expires_at, organization_id, external_user_id, ad_account_name, last_connected_at, updated_at')
      .eq('platform', 'snapchat')
      .not('refresh_token_enc', 'is', null)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // نجمع الهويات — كل سجل له access_token نجلب إيميله ومنظمته من Snapchat API
    // نتجنب تكرار نفس organization_id
    const seenOrgs = new Set<string>();
    const identities: {
      identity_key: string;
      display_name: string | null;
      last_used_at: string | null;
    }[] = [];

    for (const row of data || []) {
      if (!row.refresh_token_enc) continue;

      try {
        // جلب توكن صالح — مع تجديد تلقائي إذا انتهى
        const accessToken = await getValidToken(row);
        if (!accessToken) continue;
        const { email, orgId, orgName } = await getUserEmailFromToken(accessToken);

        // نستخدم organization_id كـ identity_key (أو نحفظه إذا لم يكن موجوداً)
        const finalOrgId = row.organization_id || orgId;
        if (!finalOrgId) continue;
        if (seenOrgs.has(finalOrgId)) continue;
        seenOrgs.add(finalOrgId);

        // حفظ organization_id إذا لم يكن محفوظاً
        if (!row.organization_id && orgId) {
          await supabase
            .from('ad_platform_accounts')
            .update({ organization_id: orgId })
            .eq('store_id', row.store_id)
            .eq('platform', 'snapchat');
        }

        // الإيميل هو الاسم الأوضح، ثم اسم المنظمة، ثم ad_account_name
        const displayName = email || orgName || row.ad_account_name || null;

        identities.push({
          identity_key: finalOrgId,
          display_name: displayName,
          last_used_at: row.last_connected_at || row.updated_at || null,
        });
      } catch {
        // token منتهي أو خطأ — تجاهل هذا السجل
      }
    }

    return NextResponse.json({ identities });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
