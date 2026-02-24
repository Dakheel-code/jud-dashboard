/**
 * GET /api/meta/insights-live?storeId=...&datePreset=last_7d
 * يجلب الإحصائيات مباشرة من Meta API (بدون كاش)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchInsightsSummary } from '@/lib/meta/client';
import { decryptToken } from '@/lib/meta/encryption';
import { requireMetaRead } from '@/lib/meta/guard';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const guard = await requireMetaRead();
  if (!guard.ok) return guard.error!;

  const storeId    = request.nextUrl.searchParams.get('storeId');
  const datePreset = request.nextUrl.searchParams.get('datePreset') || 'last_7d';

  if (!storeId) return NextResponse.json({ error: 'storeId مطلوب' }, { status: 400 });

  const supabase = getSupabase();

  const { data: conn, error: connErr } = await supabase
    .from('store_meta_connections')
    .select('access_token_encrypted, ad_account_id, status')
    .eq('store_id', storeId)
    .in('status', ['active', 'connected'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (connErr || !conn?.ad_account_id) {
    console.log('[meta/insights-live] no connection found, connErr:', connErr?.message, 'storeId:', storeId);
    return NextResponse.json({ summary: null, debug: { reason: 'no_connection', connErr: connErr?.message } });
  }

  console.log('[meta/insights-live] found connection, status:', conn.status, 'ad_account_id:', conn.ad_account_id);

  try {
    const token   = decryptToken(conn.access_token_encrypted);
    const summary = await fetchInsightsSummary(conn.ad_account_id, token, datePreset);
    console.log('[meta/insights-live] summary result:', summary ? 'has data' : 'null', 'spend:', summary?.spend);
    return NextResponse.json({ summary });
  } catch (err: any) {
    console.error('[meta/insights-live] error:', err.message);
    // خطأ OAuth — التوكن منتهي الصلاحية
    const isOAuth = err.message?.includes('OAuthException') || err.message?.includes('access token') || err.message?.includes('190');
    if (isOAuth) {
      // تحديث status في قاعدة البيانات
      await supabase
        .from('store_meta_connections')
        .update({ status: 'error' })
        .eq('store_id', storeId)
        .eq('ad_account_id', conn.ad_account_id);
      return NextResponse.json({ summary: null, needs_reauth: true, error: 'token_expired' });
    }
    return NextResponse.json({ error: err.message, summary: null }, { status: 500 });
  }
}
