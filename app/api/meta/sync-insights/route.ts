/**
 * POST /api/meta/sync-insights?storeId=...&datePreset=last_7d
 * يجلب إحصائيات الإعلانات ويحفظها في meta_insights_cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchInsights } from '@/lib/meta/client';
import { decryptToken } from '@/lib/meta/encryption';
import { requireMetaManage } from '@/lib/meta/guard';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const VALID_PRESETS = [
  'today', 'yesterday', 'last_3d', 'last_7d',
  'last_14d', 'last_28d', 'last_30d', 'last_90d',
  'this_month', 'last_month',
];

export async function POST(request: NextRequest) {
  const guard = await requireMetaManage();
  if (!guard.ok) return guard.error!;

  const { searchParams } = request.nextUrl;
  const storeId    = searchParams.get('storeId');
  const datePreset = searchParams.get('datePreset') || 'last_7d';

  if (!storeId) {
    return NextResponse.json({ error: 'storeId مطلوب' }, { status: 400 });
  }

  if (!VALID_PRESETS.includes(datePreset)) {
    return NextResponse.json({ error: `datePreset غير صالح. المتاح: ${VALID_PRESETS.join(', ')}` }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: conn, error: connErr } = await supabase
    .from('store_meta_connections')
    .select('access_token_encrypted, ad_account_id, status')
    .eq('store_id', storeId)
    .eq('status', 'active')
    .single();

  if (connErr || !conn) {
    return NextResponse.json({ error: 'لا يوجد ربط نشط لهذا المتجر' }, { status: 404 });
  }

  if (!conn.ad_account_id) {
    return NextResponse.json({ error: 'لم يتم اختيار حساب إعلاني بعد' }, { status: 400 });
  }

  try {
    const token    = decryptToken(conn.access_token_encrypted);
    const insights = await fetchInsights(conn.ad_account_id, token, datePreset);

    if (insights.length === 0) {
      return NextResponse.json({ synced: 0, message: 'لا توجد إحصائيات' });
    }

    const rows = insights.map((ins: any) => ({
      store_id:             storeId,
      ad_account_id:        conn.ad_account_id,
      ad_id:                ins.ad_id || null,
      campaign_id:          ins.campaign_id || null,
      date_start:           ins.date_start,
      date_stop:            ins.date_stop,
      spend:                parseFloat(ins.spend || '0'),
      impressions:          parseInt(ins.impressions || '0', 10),
      clicks:               parseInt(ins.clicks || '0', 10),
      reach:                parseInt(ins.reach || '0', 10),
      ctr:                  parseFloat(ins.ctr || '0'),
      cpc:                  parseFloat(ins.cpc || '0'),
      cpm:                  parseFloat(ins.cpm || '0'),
      conversions:          parseInt(ins.conversions || '0', 10),
      cost_per_conversion:  parseFloat(ins.cost_per_conversion || '0'),
      currency:             ins.account_currency || 'SAR',
      updated_at:           new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase
      .from('meta_insights_cache')
      .upsert(rows, {
        onConflict: 'ad_account_id,ad_id,date_start,date_stop',
      });

    if (upsertErr) throw new Error(upsertErr.message);

    return NextResponse.json({ synced: rows.length, date_preset: datePreset });
  } catch (err: any) {
    console.error('Meta sync-insights error:', err.message);

    if (err.message?.includes('OAuthException') || err.message?.includes('token')) {
      await supabase
        .from('store_meta_connections')
        .update({ status: 'error' })
        .eq('store_id', storeId);
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
