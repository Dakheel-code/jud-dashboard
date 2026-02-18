/**
 * GET /api/integrations/snapchat/identities
 *
 * يرجع قائمة حسابات Snapchat المربوطة (Distinct) مع refresh_token موجود
 * مرتبة حسب آخر تحديث
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration missing');
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // جلب كل سجلات Snapchat التي لديها refresh_token
    // نجلب بدون external_display_name لتجنب خطأ العمود غير الموجود في قواعد قديمة
    const { data, error } = await supabase
      .from('ad_platform_accounts')
      .select('external_user_id, organization_id, ad_account_id, ad_account_name, last_connected_at, updated_at, store_id')
      .eq('platform', 'snapchat')
      .not('refresh_token_enc', 'is', null)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message, debug: 'query_failed' }, { status: 500 });
    }

    // محاولة جلب external_display_name بشكل منفصل (قد لا يكون العمود موجوداً)
    let displayNames: Record<string, string> = {};
    try {
      const { data: dnData } = await supabase
        .from('ad_platform_accounts')
        .select('external_user_id, organization_id, external_display_name')
        .eq('platform', 'snapchat')
        .not('refresh_token_enc', 'is', null);
      for (const row of dnData || []) {
        const key = row.external_user_id || row.organization_id;
        if (key && row.external_display_name) displayNames[key] = row.external_display_name;
      }
    } catch { /* العمود غير موجود بعد */ }

    // Distinct بناءً على external_user_id أولاً، ثم organization_id، ثم ad_account_id كـ fallback أخير
    const seen = new Set<string>();
    const identities: {
      identity_key: string;
      display_name: string | null;
      last_used_at: string | null;
    }[] = [];

    // نجمع أيضاً كل ad_account_names لكل organization_id
    const orgAdAccountNames: Record<string, string[]> = {};
    for (const row of data || []) {
      if (row.organization_id && row.ad_account_name) {
        if (!orgAdAccountNames[row.organization_id]) orgAdAccountNames[row.organization_id] = [];
        if (!orgAdAccountNames[row.organization_id].includes(row.ad_account_name)) {
          orgAdAccountNames[row.organization_id].push(row.ad_account_name);
        }
      }
    }

    for (const row of data || []) {
      const key = row.external_user_id || row.organization_id || row.ad_account_id;
      if (!key || seen.has(key)) continue;
      seen.add(key);

      // اسم العرض بالأولوية:
      // 1. external_display_name (اسم مستخدم Snapchat)
      // 2. إذا كان الـ key هو organization_id → نعرض أسماء الحسابات الإعلانية المرتبطة
      // 3. ad_account_name مباشرة
      // 4. external_user_id
      let displayName: string | null = displayNames[key] || null;
      if (!displayName) {
        if (row.organization_id && key === row.organization_id && orgAdAccountNames[key]) {
          displayName = orgAdAccountNames[key].join(' / ');
        } else {
          displayName = row.ad_account_name || row.external_user_id || null;
        }
      }

      identities.push({
        identity_key: key,
        display_name: displayName,
        last_used_at: row.last_connected_at || row.updated_at || null,
      });
    }

    return NextResponse.json({ identities, _debug: { total_rows: data?.length, distinct: identities.length } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
