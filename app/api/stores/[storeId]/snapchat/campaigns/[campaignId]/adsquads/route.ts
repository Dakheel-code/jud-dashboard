/**
 * GET /api/stores/[storeId]/snapchat/campaigns/[campaignId]/adsquads
 * جلب المجموعات الإعلانية (Ad Squads) لحملة معينة مع الإحصائيات
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/integrations/token-manager';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SNAPCHAT_API_URL = 'https://adsapi.snapchat.com/v1';
const USD_TO_SAR = 3.75;

function toSnapStartTime(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00:00.000-00:00`;
}

function toSnapEndTime(date: Date): string {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00:00.000-00:00`;
}

function getDateRange(range: string): { start: Date; end: Date } {
  const AST_OFFSET_MS = 3 * 60 * 60 * 1000;
  const nowAST = Date.now() + AST_OFFSET_MS;
  const astDate = new Date(nowAST);
  const todayAST = new Date(Date.UTC(astDate.getUTCFullYear(), astDate.getUTCMonth(), astDate.getUTCDate()));

  if (range === 'today') return { start: todayAST, end: todayAST };
  if (range === 'yesterday') {
    const y = new Date(todayAST);
    y.setUTCDate(y.getUTCDate() - 1);
    return { start: y, end: y };
  }
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const end = new Date(todayAST);
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { start, end };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string; campaignId: string } }
) {
  try {
    let { storeId, campaignId } = params;
    const range = request.nextUrl.searchParams.get('range') || '7d';

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // تحويل storeId من store_url إلى UUID إذا لزم الأمر
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
    if (!isUuid) {
      const { data: storeRow } = await supabase
        .from('stores')
        .select('id')
        .eq('store_url', storeId)
        .single();
      if (storeRow?.id) storeId = storeRow.id;
    }

    const { data: integration } = await supabase
      .from('ad_platform_accounts')
      .select('ad_account_id, currency')
      .eq('store_id', storeId)
      .eq('platform', 'snapchat')
      .single();

    if (!integration?.ad_account_id) {
      return NextResponse.json({ success: false, error: 'No connected Snapchat account' }, { status: 400 });
    }

    const accessToken = await getValidAccessToken(storeId, 'snapchat');
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Token expired', needs_reauth: true }, { status: 401 });
    }

    const headers = { Authorization: `Bearer ${accessToken}` };
    const { start, end } = getDateRange(range);
    const startTime = toSnapStartTime(start);
    const endTime = toSnapEndTime(end);
    const conversionRate = (integration.currency || 'USD') === 'USD' ? USD_TO_SAR : 1;

    // محاولة 1: جلب Ad Squads مباشرة بـ campaign_ids filter
    const squadsUrl1 = `${SNAPCHAT_API_URL}/adaccounts/${integration.ad_account_id}/adsquads?campaign_id=${campaignId}&limit=100`;
    const squadsRes1 = await fetch(squadsUrl1, { headers });
    const squadsData1 = squadsRes1.ok ? await squadsRes1.json() : null;
    let rawSquads = squadsData1?.adsquads || [];

    // محاولة 2: إذا لم تنجح المحاولة الأولى، جلب الكل وفلترة
    if (rawSquads.length === 0) {
      const squadsUrl2 = `${SNAPCHAT_API_URL}/adaccounts/${integration.ad_account_id}/adsquads?limit=200`;
      const squadsRes2 = await fetch(squadsUrl2, { headers });
      if (squadsRes2.ok) {
        const squadsData2 = await squadsRes2.json();
        const allSquads = squadsData2?.adsquads || [];
        // فلترة بـ campaign_id
        rawSquads = allSquads.filter((s: any) =>
          s.adsquad?.campaign_id === campaignId
        );
        // إذا لا يزال فارغاً، أرجع كل المجموعات مع debug
        if (rawSquads.length === 0 && allSquads.length > 0) {
          return NextResponse.json({
            success: true,
            ad_squads: [],
            debug: {
              campaignId,
              totalSquads: allSquads.length,
              sampleCampaignIds: allSquads.slice(0, 5).map((s: any) => s.adsquad?.campaign_id),
              note: 'No squads matched campaignId filter'
            }
          });
        }
      }
    }

    const squads = rawSquads.map((s: any) => ({
      id: s.adsquad?.id,
      name: s.adsquad?.name || 'Unknown',
      status: s.adsquad?.status || 'UNKNOWN',
      daily_budget_micro: s.adsquad?.daily_budget_micro,
      targeting: s.adsquad?.targeting,
    })).filter((s: any) => s.id);

    // جلب إحصائيات Ad Squads
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
            const s = row?.stats || {};
            if (row?.id) {
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

    const squadsWithStats = squads.map((sq: any) => {
      const stats = statsMap[sq.id] || { spend: 0, impressions: 0, swipes: 0, orders: 0, sales: 0 };
      const roas = stats.spend > 0 ? Math.round((stats.sales / stats.spend) * 100) / 100 : 0;
      const cpa = stats.orders > 0 ? Math.round((stats.spend / stats.orders) * 100) / 100 : 0;
      return { ...sq, ...stats, roas, cpa };
    });

    squadsWithStats.sort((a: any, b: any) => (b.spend || 0) - (a.spend || 0));

    return NextResponse.json({
      success: true,
      campaign_id: campaignId,
      ad_squads: squadsWithStats,
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
