import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCampaigns, microsToAmount } from '@/lib/google-ads';
import type { GoogleAdsConnection } from '@/types/google-ads';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { searchParams } = new URL(req.url);
    const store_id = searchParams.get('store_id');
    const sync = searchParams.get('sync') === 'true';

    if (!store_id) {
      return NextResponse.json({ error: 'store_id مطلوب' }, { status: 400 });
    }

    // جلب الربط النشط
    const { data: connData, error: connError } = await supabase
      .from('google_ads_connections')
      .select('*')
      .eq('store_id', store_id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (connError || !connData) {
      return NextResponse.json({ connected: false, campaigns: [] }, { status: 404 });
    }

    const connection = connData as GoogleAdsConnection;

    // تحقق من الكاش (آخر ساعة) إذا لم يطلب sync
    if (!sync) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: cached } = await supabase
        .from('google_ads_campaigns_cache')
        .select('*')
        .eq('store_id', store_id)
        .gte('last_synced_at', oneHourAgo)
        .limit(1);

      if (cached && cached.length > 0) {
        const { data: allCached } = await supabase
          .from('google_ads_campaigns_cache')
          .select('*')
          .eq('store_id', store_id);

        const campaigns = (allCached ?? []).map(c => ({
          ...c,
          budget_amount: microsToAmount(c.budget_amount_micros ?? 0),
        }));

        return NextResponse.json({ source: 'cache', campaigns, total: campaigns.length });
      }
    }

    // جلب من API
    const rawCampaigns = await getCampaigns(connection);

    // حفظ في الكاش
    for (const c of rawCampaigns) {
      const cam = c as any;
      await supabase
        .from('google_ads_campaigns_cache')
        .upsert({
          store_id,
          customer_id: connection.customer_id,
          campaign_id: cam.id,
          campaign_name: cam.name,
          status: cam.status,
          advertising_channel_type: cam.advertisingChannelType,
          budget_amount_micros: cam.budgetAmountMicros ? Number(cam.budgetAmountMicros) : 0,
          bidding_strategy_type: cam.biddingStrategyType,
          campaign_data: cam,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'store_id,campaign_id' });
    }

    const campaigns = rawCampaigns.map((c: any) => ({
      campaign_id: c.id,
      campaign_name: c.name,
      status: c.status,
      advertising_channel_type: c.advertisingChannelType,
      budget_amount: microsToAmount(c.budgetAmountMicros ?? 0),
      budget_amount_micros: c.budgetAmountMicros ?? 0,
      bidding_strategy_type: c.biddingStrategyType,
    }));

    return NextResponse.json({ source: 'api', campaigns, total: campaigns.length });
  } catch (e: any) {
    console.error('Google Ads campaigns error:', e);
    return NextResponse.json({ error: e.message || 'خطأ في جلب الحملات' }, { status: 500 });
  }
}
