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
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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


    // جلب الحملات
    const campaignsResponse = await fetch(
      `${SNAPCHAT_API_URL}/adaccounts/${adAccountId}/campaigns`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!campaignsResponse.ok) {
      const errorText = await campaignsResponse.text();
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    const campaignsData = await campaignsResponse.json();
    const allCampaigns = campaignsData.campaigns || [];


    // ترتيب الحملات حسب تاريخ التحديث (الأحدث أولاً)
    const sortedCampaigns = allCampaigns.sort((a: any, b: any) => {
      const dateA = new Date(a.campaign?.updated_at || a.campaign?.created_at || 0);
      const dateB = new Date(b.campaign?.updated_at || b.campaign?.created_at || 0);
      return dateB.getTime() - dateA.getTime();
    });

    // أخذ آخر 5 حملات فقط (بغض النظر عن الحالة)
    const latestCampaigns = sortedCampaigns.slice(0, 5);


    // جلب IDs الحملات لجلب الإحصائيات
    const campaignIds = latestCampaigns.map((c: any) => c.campaign?.id).filter(Boolean);
    
    if (campaignIds.length === 0) {
      return NextResponse.json({
        success: true,
        campaigns: [],
        totals: { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 },
      });
    }

    // الحقول المطلوبة للإحصائيات
    const statsFields = 'impressions,swipes,spend,conversion_purchases,conversion_purchases_value';
    
    // جلب إحصائيات وإعلانات كل حملة
    const campaignStatsMap: Record<string, any> = {};
    const campaignAdsMap: Record<string, any[]> = {};
    
    for (const campaignId of campaignIds) {
      try {
        // جلب إحصائيات الحملة
        const statsUrl = `${SNAPCHAT_API_URL}/campaigns/${campaignId}/stats?granularity=TOTAL&fields=${statsFields}&start_time=${dateRange.start}T00:00:00.000-00:00&end_time=${dateRange.end}T23:59:59.999-00:00`;
        
        const statsResponse = await fetch(statsUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          
          // Snapchat يرجع الإحصائيات في timeseries_stats أو total_stats
          const stats = statsData.timeseries_stats?.[0]?.timeseries?.[0]?.stats 
                     || statsData.total_stats?.[0]?.stats 
                     || {};
          campaignStatsMap[campaignId] = stats;
        } else {
          const errorText = await statsResponse.text();
        }

        // جلب الإعلانات (Ads) تحت الحملة
        const adsResponse = await fetch(
          `${SNAPCHAT_API_URL}/campaigns/${campaignId}/ads`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        
        if (adsResponse.ok) {
          const adsData = await adsResponse.json();
          const ads = adsData.ads || [];
          
          // جلب إحصائيات كل إعلان
          const processedAds = [];
          for (const adItem of ads.slice(0, 5)) { // أول 5 إعلانات فقط
            const ad = adItem.ad;
            if (!ad?.id) continue;
            
            try {
              const adStatsUrl = `${SNAPCHAT_API_URL}/ads/${ad.id}/stats?granularity=TOTAL&fields=${statsFields}&start_time=${dateRange.start}T00:00:00.000-00:00&end_time=${dateRange.end}T23:59:59.999-00:00`;
              const adStatsResponse = await fetch(adStatsUrl, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              
              let adStats: any = {};
              if (adStatsResponse.ok) {
                const adStatsData = await adStatsResponse.json();
                adStats = adStatsData.timeseries_stats?.[0]?.timeseries?.[0]?.stats 
                       || adStatsData.total_stats?.[0]?.stats 
                       || {};
              }
              
              const adSpend = (adStats.spend || 0) / 1000000;
              const adRevenue = (adStats.conversion_purchases_value || 0) / 1000000;
              
              processedAds.push({
                ad_name: ad.name || 'Unknown Ad',
                ad_id: ad.id,
                status: ad.status,
                impressions: adStats.impressions || 0,
                clicks: adStats.swipes || 0,
                spend: adSpend,
                conversions: adStats.conversion_purchases || 0,
                revenue: adRevenue,
                roas: adSpend > 0 ? adRevenue / adSpend : 0,
              });
            } catch (adErr) {
            }
          }
          campaignAdsMap[campaignId] = processedAds;
        }
      } catch (err) {
      }
    }

    // جلب إحصائيات الحساب الإعلاني للإجماليات
    const accountStatsUrl = `${SNAPCHAT_API_URL}/adaccounts/${adAccountId}/stats?granularity=TOTAL&fields=${statsFields}&start_time=${dateRange.start}T00:00:00.000-00:00&end_time=${dateRange.end}T23:59:59.999-00:00`;
    
    const accountStatsResponse = await fetch(accountStatsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let accountStats: any = {};
    if (accountStatsResponse.ok) {
      const accountStatsData = await accountStatsResponse.json();
      accountStats = accountStatsData.timeseries_stats?.[0]?.timeseries?.[0]?.stats 
                  || accountStatsData.total_stats?.[0]?.stats 
                  || {};
    } else {
      const errorText = await accountStatsResponse.text();
    }

    // تجميع البيانات للحملات مع إحصائياتها وإعلاناتها
    const processedCampaigns = latestCampaigns.map((c: any) => {
      const campaign = c.campaign;
      const stats = campaignStatsMap[campaign?.id] || {};
      const ads = campaignAdsMap[campaign?.id] || [];
      
      const spend = (stats.spend || 0) / 1000000;
      const revenue = (stats.conversion_purchases_value || 0) / 1000000;
      const roas = spend > 0 ? revenue / spend : 0;
      
      return {
        campaign: campaign?.name || 'Unknown',
        campaign_id: campaign?.id,
        status: campaign?.status,
        impressions: stats.impressions || 0,
        clicks: stats.swipes || 0,
        spend: spend,
        conversions: stats.conversion_purchases || 0,
        revenue: revenue,
        roas: roas,
        ads: ads,
      };
    });

    // حساب الإجماليات من إحصائيات الحساب
    const totals = {
      spend: (accountStats.spend || 0) / 1000000,
      impressions: accountStats.impressions || 0,
      clicks: accountStats.swipes || 0,
      conversions: accountStats.conversion_purchases || 0,
      revenue: (accountStats.conversion_purchases_value || 0) / 1000000,
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
