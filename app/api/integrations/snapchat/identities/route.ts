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
    const { data, error } = await supabase
      .from('ad_platform_accounts')
      .select('external_user_id, external_display_name, organization_id, last_connected_at, updated_at, store_id')
      .eq('platform', 'snapchat')
      .not('refresh_token_enc', 'is', null)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Distinct بناءً على external_user_id أولاً، ثم organization_id كـ fallback
    // نتجاهل السجلات التي ليس فيها أي منهما (لا نعرضها كهوية)
    const seen = new Set<string>();
    const identities: {
      identity_key: string;
      display_name: string | null;
      last_used_at: string | null;
    }[] = [];

    for (const row of data || []) {
      // الأولوية: external_user_id → organization_id (لا ad_account_id)
      const key = row.external_user_id || row.organization_id;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      identities.push({
        identity_key: key,
        display_name: row.external_display_name || row.external_user_id || null,
        last_used_at: row.last_connected_at || row.updated_at || null,
      });
    }

    return NextResponse.json({ identities });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
