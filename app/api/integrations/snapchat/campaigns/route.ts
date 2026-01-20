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

    // فلترة الحملات النشطة فقط (ACTIVE أو PAUSED)
    const activeCampaigns = allCampaigns.filter((c: any) => {
      const status = c.campaign?.status;
      return status === 'ACTIVE' || status === 'PAUSED';
    });
    
    // الحملات غير النشطة (للعرض عند الطلب)
    const inactiveCampaigns = allCampaigns.filter((c: any) => {
      const status = c.campaign?.status;
      return status !== 'ACTIVE' && status !== 'PAUSED';
    });

    console.log('Active campaigns:', activeCampaigns.length);
    console.log('Inactive campaigns:', inactiveCampaigns.length);

    // جلب إحصائيات الحملات النشطة فقط
    const campaignIds = activeCampaigns.map((c: any) => c.campaign?.id).filter(Boolean);
    
    if (campaignIds.length === 0) {
      return NextResponse.json({
        success: true,
        campaigns: [],
        totals: { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
      });
    }

    // جلب الإحصائيات والإعلانات لكل حملة
    const campaignDataPromises = campaignIds.map(async (campaignId: string) => {
      try {
        // جلب الإحصائيات
        const statsResponse = await fetch(
          `${SNAPCHAT_API_URL}/campaigns/${campaignId}/stats?granularity=TOTAL&start_time=${dateRange.start}T00:00:00.000Z&end_time=${dateRange.end}T23:59:59.999Z`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        
        // جلب Ad Squads (مجموعات الإعلانات)
        const adSquadsResponse = await fetch(
          `${SNAPCHAT_API_URL}/campaigns/${campaignId}/adsquads`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        let stats: any = {};
        let ads: any[] = [];

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          stats = statsData.total_stats?.[0]?.stats || {};
        }

        if (adSquadsResponse.ok) {
          const adSquadsData = await adSquadsResponse.json();
          const adSquads = adSquadsData.adsquads || [];
          
          // جلب الإعلانات من كل Ad Squad
          for (const sq of adSquads) {
            const adSquadId = sq.adsquad?.id;
            if (!adSquadId) continue;
            
            try {
              const adsResponse = await fetch(
                `${SNAPCHAT_API_URL}/adsquads/${adSquadId}/ads`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                }
              );
              
              if (adsResponse.ok) {
                const adsData = await adsResponse.json();
                const adsList = adsData.ads || [];
                
                for (const ad of adsList) {
                  const adInfo = ad.ad;
                  if (adInfo?.status === 'ACTIVE' || adInfo?.status === 'PAUSED') {
                    // جلب إحصائيات الإعلان
                    try {
                      const adStatsResponse = await fetch(
                        `${SNAPCHAT_API_URL}/ads/${adInfo.id}/stats?granularity=TOTAL&start_time=${dateRange.start}T00:00:00.000Z&end_time=${dateRange.end}T23:59:59.999Z`,
                        {
                          headers: { Authorization: `Bearer ${accessToken}` },
                        }
                      );
                      
                      let adStats: any = {};
                      if (adStatsResponse.ok) {
                        const adStatsData = await adStatsResponse.json();
                        adStats = adStatsData.total_stats?.[0]?.stats || {};
                      }
                      
                      ads.push({
                        ad_name: adInfo.name || 'Unknown Ad',
                        ad_id: adInfo.id,
                        status: adInfo.status,
                        impressions: adStats.impressions || 0,
                        clicks: adStats.swipes || adStats.clicks || 0,
                        spend: (adStats.spend || 0) / 1000000,
                        conversions: adStats.conversion_purchases || adStats.purchases || 0,
                        revenue: (adStats.conversion_purchases_value || adStats.total_conversion_value || 0) / 1000000,
                      });
                    } catch (adStatsErr) {
                      console.error('Error fetching ad stats:', adStatsErr);
                    }
                  }
                }
              }
            } catch (adsErr) {
              console.error('Error fetching ads:', adsErr);
            }
          }
        }

        return { campaignId, stats, ads };
      } catch (err) {
        console.error('Error fetching campaign data:', campaignId, err);
        return { campaignId, stats: {}, ads: [] };
      }
    });

    const allCampaignData = await Promise.all(campaignDataPromises);
    const campaignDataMap = new Map(allCampaignData.map((d) => [d.campaignId, d]));

    // تجميع البيانات
    const processedCampaigns = activeCampaigns.map((c: any) => {
      const campaign = c.campaign;
      const data = campaignDataMap.get(campaign?.id) || { stats: {}, ads: [] };
      const stats = data.stats;
      
      return {
        campaign: campaign?.name || 'Unknown',
        campaign_id: campaign?.id,
        status: campaign?.status,
        impressions: stats.impressions || 0,
        clicks: stats.swipes || stats.clicks || 0,
        spend: (stats.spend || 0) / 1000000,
        conversions: stats.conversion_purchases || stats.purchases || 0,
        revenue: (stats.conversion_purchases_value || stats.total_conversion_value || 0) / 1000000,
        ads: data.ads || [],
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

    // معالجة الحملات غير النشطة أيضاً للعرض عند الطلب
    const processedInactiveCampaigns = inactiveCampaigns.map((c: any) => {
      const campaign = c.campaign;
      return {
        campaign: campaign?.name || 'Unknown',
        campaign_id: campaign?.id,
        status: campaign?.status,
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        revenue: 0,
      };
    });

    return NextResponse.json({
      success: true,
      campaigns: processedCampaigns,
      inactiveCampaigns: processedInactiveCampaigns,
      totals,
      dateRange,
      counts: {
        active: processedCampaigns.length,
        inactive: processedInactiveCampaigns.length,
        total: allCampaigns.length,
      },
    });
  } catch (error) {
    console.error('Snapchat campaigns error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
