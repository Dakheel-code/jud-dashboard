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

async function getOrganizationsFromToken(accessToken: string): Promise<{ id: string; name: string } | null> {
  try {
    const res = await fetch(`${SNAPCHAT_API_URL}/me/organizations?with_ad_accounts=true`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const orgs = data.organizations || [];
    if (orgs.length === 0) return null;
    // نرجع أول منظمة (المستخدم عادة لديه منظمة واحدة)
    const org = orgs[0]?.organization || orgs[0];
    return { id: org?.id || '', name: org?.name || '' };
  } catch {
    return null;
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

    // نجمع الهويات — كل سجل له access_token نجلب منظمته من Snapchat API
    // نتجنب تكرار نفس organization_id
    const seenOrgs = new Set<string>();
    const identities: {
      identity_key: string;
      display_name: string | null;
      last_used_at: string | null;
    }[] = [];

    for (const row of data || []) {
      // إذا كان organization_id محفوظاً مسبقاً — استخدمه مباشرة
      if (row.organization_id && !seenOrgs.has(row.organization_id)) {
        seenOrgs.add(row.organization_id);
        identities.push({
          identity_key: row.organization_id,
          display_name: null, // سنملأه لاحقاً من API
          last_used_at: row.last_connected_at || row.updated_at || null,
        });
        continue;
      }

      // إذا لم يكن organization_id محفوظاً — نجلبه من API
      if (!row.organization_id && row.access_token_enc) {
        try {
          const accessToken = decrypt(row.access_token_enc);
          const org = await getOrganizationsFromToken(accessToken);
          if (org?.id && !seenOrgs.has(org.id)) {
            seenOrgs.add(org.id);
            // حفظ organization_id في قاعدة البيانات للمرات القادمة
            await supabase
              .from('ad_platform_accounts')
              .update({ organization_id: org.id })
              .eq('store_id', row.store_id)
              .eq('platform', 'snapchat');

            identities.push({
              identity_key: org.id,
              display_name: org.name || null,
              last_used_at: row.last_connected_at || row.updated_at || null,
            });
          }
        } catch {
          // token منتهي أو خطأ — تجاهل هذا السجل
        }
      }
    }

    // الآن نجلب أسماء المنظمات لمن لم يُجلب اسمه بعد
    // (السجلات التي كان organization_id محفوظاً لكن لا يوجد اسم)
    // نستخدم أول سجل لكل منظمة لجلب اسمها
    const needsName = identities.filter(i => !i.display_name);
    if (needsName.length > 0) {
      // جلب access_token لأي سجل من كل منظمة
      for (const identity of needsName) {
        const matchRow = (data || []).find(r => r.organization_id === identity.identity_key && r.access_token_enc);
        if (matchRow?.access_token_enc) {
          try {
            const accessToken = decrypt(matchRow.access_token_enc);
            const org = await getOrganizationsFromToken(accessToken);
            if (org?.name) identity.display_name = org.name;
          } catch { /* تجاهل */ }
        }
        // إذا لم نجد اسماً، نستخدم ad_account_name من نفس المنظمة
        if (!identity.display_name) {
          const matchRows = (data || []).filter(r => r.organization_id === identity.identity_key && r.ad_account_name);
          if (matchRows.length > 0) {
            identity.display_name = matchRows.map(r => r.ad_account_name).join(' / ');
          }
        }
      }
    }

    return NextResponse.json({ identities });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
