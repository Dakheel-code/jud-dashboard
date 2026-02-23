import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SNAPCHAT_API_URL = 'https://adsapi.snapchat.com/v1';
const USD_TO_SAR = 3.75;

function toSnapDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function toSnapStartTime(date: Date) { return `${toSnapDate(date)}T00:00:00.000-00:00`; }
function toSnapEndTime(date: Date) {
  const next = new Date(date); next.setUTCDate(next.getUTCDate() + 1);
  return `${toSnapDate(next)}T00:00:00.000-00:00`;
}
function getDateRange(range: string) {
  const nowAST = Date.now() + 3 * 60 * 60 * 1000;
  const d = new Date(nowAST);
  const today = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (range === 'today') return { start: today, end: today };
  if (range === 'yesterday') { const y = new Date(today); y.setUTCDate(y.getUTCDate() - 1); return { start: y, end: y }; }
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const end = new Date(today); end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - days + 1);
  return { start, end };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    let storeId = params.storeId;
    const campaignId = request.nextUrl.searchParams.get('campaignId') || '';
    const range = request.nextUrl.searchParams.get('range') || '7d';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // تحويل storeId إلى UUID إذا لزم
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
    if (!isUuid) {
      const { data: storeRow } = await supabase.from('stores').select('id').eq('store_url', storeId).single();
      if (storeRow?.id) storeId = storeRow.id;
    }

    // جلب بيانات الربط — نفس طريقة API الحملات
    const { data: integration, error: intErr } = await supabase
      .from('ad_platform_accounts')
      .select('*')
      .eq('store_id', storeId)
      .eq('platform', 'snapchat')
      .single();

    if (intErr || !integration?.ad_account_id) {
      return NextResponse.json({
        success: false,
        error: 'Snapchat not connected',
        debug: { storeId, intErr: intErr?.message }
      }, { status: 200 });
    }

    // جلب التوكن — نفس طريقة API الحملات (مباشرة من السجل)
    const { decrypt } = await import('@/lib/encryption');
    if (!integration.access_token_enc) {
      return NextResponse.json({ success: false, error: 'No access token' }, { status: 401 });
    }
    const accessToken = decrypt(integration.access_token_enc);
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Token decrypt failed' }, { status: 401 });
    }

    const headers = { Authorization: `Bearer ${accessToken}` };
    const { start, end } = getDateRange(range);
    const startTime = toSnapStartTime(start);
    const endTime = toSnapEndTime(end);
    const conversionRate = (integration.currency || 'USD') === 'USD' ? USD_TO_SAR : 1;

    // جلب Ad Squads — محاولة مع campaign_id filter أولاً
    let rawSquads: any[] = [];

    if (campaignId) {
      const url1 = `${SNAPCHAT_API_URL}/adaccounts/${integration.ad_account_id}/adsquads?campaign_id=${campaignId}&limit=100`;
      const res1 = await fetch(url1, { headers });
      if (res1.ok) {
        const data1 = await res1.json();
        rawSquads = data1?.adsquads || [];
      }
    }

    // إذا لم تنجح، جلب الكل وفلترة
    if (rawSquads.length === 0) {
      const url2 = `${SNAPCHAT_API_URL}/adaccounts/${integration.ad_account_id}/adsquads?limit=200`;
      const res2 = await fetch(url2, { headers });
      if (res2.ok) {
        const data2 = await res2.json();
        const all = data2?.adsquads || [];
        rawSquads = campaignId
          ? all.filter((s: any) => s.adsquad?.campaign_id === campaignId)
          : all;

        if (rawSquads.length === 0 && all.length > 0) {
          return NextResponse.json({
            success: true,
            ad_squads: [],
            debug: {
              campaignId,
              totalInAccount: all.length,
              sampleIds: all.slice(0, 3).map((s: any) => ({
                squad_id: s.adsquad?.id,
                campaign_id: s.adsquad?.campaign_id,
              })),
            }
          });
        }
      }
    }

    const squads = rawSquads.map((s: any) => ({
      id: s.adsquad?.id,
      name: s.adsquad?.name || 'Unknown',
      status: s.adsquad?.status || 'UNKNOWN',
      daily_budget_micro: s.adsquad?.daily_budget_micro || null,
    })).filter((s: any) => s.id);

    // جلب إحصائيات
    const statsMap: Record<string, any> = {};
    if (squads.length > 0) {
      const fields = 'spend,impressions,swipes,conversion_purchases,conversion_purchases_value';
      const statsUrl = `${SNAPCHAT_API_URL}/adaccounts/${integration.ad_account_id}/stats?granularity=TOTAL&fields=${fields}&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}&breakdown=adsquad`;
      try {
        const statsRes = await fetch(statsUrl, { headers });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const rows = statsData?.total_stats?.[0]?.total_stat?.breakdown_stats?.adsquad || [];
          rows.forEach((row: any) => {
            if (row?.id) {
              const s = row?.stats || {};
              statsMap[row.id] = {
                spend: Math.round((s.spend || 0) / 1_000_000 * conversionRate * 100) / 100,
                impressions: s.impressions || 0,
                swipes: s.swipes || 0,
                orders: s.conversion_purchases || 0,
                sales: Math.round((s.conversion_purchases_value || 0) / 1_000_000 * conversionRate * 100) / 100,
              };
            }
          });
        }
      } catch {}
    }

    const result = squads.map((sq: any) => {
      const stats = statsMap[sq.id] || { spend: 0, impressions: 0, swipes: 0, orders: 0, sales: 0 };
      const roas = stats.spend > 0 ? Math.round((stats.sales / stats.spend) * 100) / 100 : 0;
      const cpa = stats.orders > 0 ? Math.round((stats.spend / stats.orders) * 100) / 100 : 0;
      return { ...sq, ...stats, roas, cpa };
    });

    result.sort((a: any, b: any) => (b.spend || 0) - (a.spend || 0));

    return NextResponse.json({ success: true, ad_squads: result });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
