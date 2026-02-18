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

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration missing');
  return createClient(supabaseUrl, supabaseKey);
}

async function getUserEmailFromToken(accessToken: string): Promise<{ email: string | null; orgId: string | null; orgName: string | null }> {
  try {
    // جلب الإيميل من /me
    const meRes = await fetch(`${SNAPCHAT_API_URL}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    let email: string | null = null;
    if (meRes.ok) {
      const meData = await meRes.json();
      email = meData.me?.email || meData.me?.display_name || null;
    }

    // جلب organization_id من /me/organizations
    const orgRes = await fetch(`${SNAPCHAT_API_URL}/me/organizations?with_ad_accounts=true`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
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
      if (!row.access_token_enc) continue;

      try {
        const accessToken = decrypt(row.access_token_enc);
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
