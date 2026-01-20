/**
 * Snapchat Campaigns - جلب بيانات الحملات من Snapchat مباشرة
 * GET /api/integrations/snapchat/campaigns?storeId=...&datePreset=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/integrations/token-manager';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SNAPCHAT_API_URL = 'https://adsapi.snapchat.com/v1';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration missing');
  return createClient(supabaseUrl, supabaseKey);
}

// تحويل date preset إلى تواريخ
function getDateRange(datePreset: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start: Date;

  switch (datePreset) {
    case 'today':
      start = now;
      break;
    case 'yesterday':
      start = new Date(now.setDate(now.getDate() - 1));
      break;
    case 'last_7d':
      start = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'last_14d':
      start = new Date(now.setDate(now.getDate() - 14));
      break;
    case 'last_30d':
      start = new Date(now.setDate(now.getDate() - 30));
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    default:
      start = new Date(now.setDate(now.getDate() - 7));
  }

  return {
    start: start.toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const datePreset = searchParams.get('datePreset') || 'last_7d';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    // جلب توكن صالح
    const accessToken = await getValidAccessToken(storeId, 'snapchat');
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not connected or token expired', needsReauth: true },
        { status: 401 }
      );
    }

    // جلب ad_account_id من قاعدة البيانات
    const supabase = getSupabaseAdmin();
    const { data: account } = await supabase
      .from('ad_platform_accounts')
      .select('ad_account_id')
      .eq('store_id', storeId)
      .eq('platform', 'snapchat')
      .single();

    if (!account?.ad_account_id) {
      return NextResponse.json({ error: 'No ad account selected' }, { status: 400 });
    }

    const adAccountId = account.ad_account_id;

    // تحديد الفترة الزمنية
    let dateRange: { start: string; end: string };
    if (startDate && endDate) {
      dateRange = { start: startDate, end: endDate };
    } else {
      dateRange = getDateRange(datePreset);
    }

    console.log('Fetching Snapchat campaigns for:', adAccountId, dateRange);

    // جلب الحملات
    const campaignsResponse = await fetch(
      `${SNAPCHAT_API_URL}/adaccounts/${adAccountId}/campaigns`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!campaignsResponse.ok) {
      const errorText = await campaignsResponse.text();
      console.error('Snapchat campaigns error:', errorText);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    const campaignsData = await campaignsResponse.json();
    const campaigns = campaignsData.campaigns || [];

    console.log('Found campaigns:', campaigns.length);

    // جلب إحصائيات الحملات
    const campaignIds = campaigns.map((c: any) => c.campaign?.id).filter(Boolean);
    
    if (campaignIds.length === 0) {
      return NextResponse.json({
        success: true,
        campaigns: [],
        totals: { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
      });
    }

    // جلب الإحصائيات لكل حملة
    const statsPromises = campaignIds.map(async (campaignId: string) => {
      try {
        const statsResponse = await fetch(
          `${SNAPCHAT_API_URL}/campaigns/${campaignId}/stats?granularity=TOTAL&start_time=${dateRange.start}T00:00:00.000Z&end_time=${dateRange.end}T23:59:59.999Z`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          return { campaignId, stats: statsData.total_stats?.[0]?.stats || {} };
        }
        return { campaignId, stats: {} };
      } catch (err) {
        console.error('Error fetching stats for campaign:', campaignId, err);
        return { campaignId, stats: {} };
      }
    });

    const allStats = await Promise.all(statsPromises);
    const statsMap = new Map(allStats.map((s) => [s.campaignId, s.stats]));

    // تجميع البيانات
    const processedCampaigns = campaigns.map((c: any) => {
      const campaign = c.campaign;
      const stats = statsMap.get(campaign?.id) || {};
      
      return {
        campaign: campaign?.name || 'Unknown',
        campaign_id: campaign?.id,
        status: campaign?.status,
        impressions: stats.impressions || 0,
        clicks: stats.swipes || stats.clicks || 0,
        spend: (stats.spend || 0) / 1000000, // Snapchat returns spend in microcurrency
        conversions: stats.conversion_purchases || stats.purchases || 0,
        revenue: (stats.conversion_purchases_value || stats.total_conversion_value || 0) / 1000000,
      };
    });

    // حساب الإجماليات
    const totals = processedCampaigns.reduce(
      (acc: any, c: any) => ({
        spend: acc.spend + c.spend,
        impressions: acc.impressions + c.impressions,
        clicks: acc.clicks + c.clicks,
        conversions: acc.conversions + c.conversions,
        revenue: acc.revenue + c.revenue,
      }),
      { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
    );

    return NextResponse.json({
      success: true,
      campaigns: processedCampaigns,
      totals,
      dateRange,
    });
  } catch (error) {
    console.error('Snapchat campaigns error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
