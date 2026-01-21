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
    const allCampaigns = campaignsData.campaigns || [];

    console.log('Found campaigns:', allCampaigns.length);

    // ترتيب الحملات حسب تاريخ التحديث (الأحدث أولاً)
    const sortedCampaigns = allCampaigns.sort((a: any, b: any) => {
      const dateA = new Date(a.campaign?.updated_at || a.campaign?.created_at || 0);
      const dateB = new Date(b.campaign?.updated_at || b.campaign?.created_at || 0);
      return dateB.getTime() - dateA.getTime();
    });

    // أخذ آخر 5 حملات فقط (بغض النظر عن الحالة)
    const latestCampaigns = sortedCampaigns.slice(0, 5);

    console.log('Latest 5 campaigns:', latestCampaigns.map((c: any) => c.campaign?.name));

    // جلب IDs الحملات لجلب الإحصائيات
    const campaignIds = latestCampaigns.map((c: any) => c.campaign?.id).filter(Boolean);
    
    if (campaignIds.length === 0) {
      return NextResponse.json({
        success: true,
        campaigns: [],
        totals: { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
      });
    }

    // جلب إحصائيات كل حملة على حدة
    const campaignStatsMap: Record<string, any> = {};
    
    for (const campaignId of campaignIds) {
      try {
        const statsResponse = await fetch(
          `${SNAPCHAT_API_URL}/campaigns/${campaignId}/stats?granularity=TOTAL&start_time=${dateRange.start}T00:00:00.000Z&end_time=${dateRange.end}T23:59:59.999Z`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          const stats = statsData.total_stats?.[0]?.stats || {};
          campaignStatsMap[campaignId] = stats;
          console.log(`Stats for campaign ${campaignId}:`, stats);
        }
      } catch (err) {
        console.error(`Error fetching stats for campaign ${campaignId}:`, err);
      }
    }

    // جلب إحصائيات الحساب الإعلاني للإجماليات
    const accountStatsResponse = await fetch(
      `${SNAPCHAT_API_URL}/adaccounts/${adAccountId}/stats?granularity=TOTAL&start_time=${dateRange.start}T00:00:00.000Z&end_time=${dateRange.end}T23:59:59.999Z`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    let accountStats: any = {};
    if (accountStatsResponse.ok) {
      const accountStatsData = await accountStatsResponse.json();
      console.log('Account stats response:', JSON.stringify(accountStatsData, null, 2));
      accountStats = accountStatsData.total_stats?.[0]?.stats || {};
    }

    // تجميع البيانات للحملات مع إحصائياتها
    const processedCampaigns = latestCampaigns.map((c: any) => {
      const campaign = c.campaign;
      const stats = campaignStatsMap[campaign?.id] || {};
      
      const spend = (stats.spend || 0) / 1000000;
      const revenue = (stats.conversion_purchases_value || stats.total_conversion_value || 0) / 1000000;
      const roas = spend > 0 ? revenue / spend : 0;
      
      return {
        campaign: campaign?.name || 'Unknown',
        campaign_id: campaign?.id,
        status: campaign?.status,
        impressions: stats.impressions || 0,
        clicks: stats.swipes || stats.clicks || 0,
        spend: spend,
        conversions: stats.conversion_purchases || stats.purchases || 0,
        revenue: revenue,
        roas: roas,
        ads: [],
      };
    });

    // حساب الإجماليات من إحصائيات الحساب
    const totals = {
      spend: (accountStats.spend || 0) / 1000000,
      impressions: accountStats.impressions || 0,
      clicks: accountStats.swipes || accountStats.clicks || 0,
      conversions: accountStats.conversion_purchases || accountStats.purchases || 0,
      revenue: (accountStats.conversion_purchases_value || accountStats.total_conversion_value || 0) / 1000000,
    };

    return NextResponse.json({
      success: true,
      campaigns: processedCampaigns,
      totals,
      dateRange,
      counts: {
        showing: processedCampaigns.length,
        total: allCampaigns.length,
      },
    });
  } catch (error) {
    console.error('Snapchat campaigns error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
