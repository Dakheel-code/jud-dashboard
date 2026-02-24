import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decryptToken } from '@/lib/meta/encryption';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId');
  if (!storeId) return NextResponse.json({ error: 'storeId مطلوب' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: conn, error: connErr } = await supabase
    .from('store_meta_connections')
    .select('id, ad_account_id, ad_account_name, status, access_token_encrypted, last_sync_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (connErr || !conn) return NextResponse.json({ error: 'لا يوجد ربط', connErr });

  let decryptOk = false;
  let decryptError = null;
  let tokenPrefix = null;
  let insightResult = null;
  let insightError = null;

  try {
    const token = decryptToken(conn.access_token_encrypted);
    decryptOk = true;
    tokenPrefix = token.substring(0, 10) + '...';

    // اختبار Meta API مباشرة
    const url = `https://graph.facebook.com/v19.0/${conn.ad_account_id}/insights?fields=spend,impressions,clicks,actions,action_values,purchase_roas&date_preset=last_7d&level=account&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
    insightResult = data;
  } catch (e: any) {
    decryptError = e.message;
  }

  return NextResponse.json({
    status: conn.status,
    ad_account_id: conn.ad_account_id,
    ad_account_name: conn.ad_account_name,
    last_sync_at: conn.last_sync_at,
    decrypt_ok: decryptOk,
    decrypt_error: decryptError,
    token_prefix: tokenPrefix,
    insight_result: insightResult,
    insight_error: insightError,
  });
}
