import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TOKENS_FILE = path.join(process.cwd(), 'data', 'platform-tokens.json');

// قراءة tokens من الملف المحلي
function readTokens(): { [storeId: string]: { [platform: string]: { accessToken: string; accountId: string; connectedAt: string } } } {
  if (fs.existsSync(TOKENS_FILE)) {
    const content = fs.readFileSync(TOKENS_FILE, 'utf-8');
    return JSON.parse(content);
  }
  return {};
}

// جلب بيانات Snapchat
async function fetchSnapchatData(accessToken: string, accountId: string, startDate: string, endDate: string) {
  try {
    // جلب الحملات
    const campaignsResponse = await fetch(
      `https://adsapi.snapchat.com/v1/adaccounts/${accountId}/campaigns`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!campaignsResponse.ok) {
      const errorText = await campaignsResponse.text();
      console.error('Snapchat API Error:', campaignsResponse.status, errorText);
      return { error: `Snapchat API Error: ${campaignsResponse.status}`, campaigns: [] };
    }

    const campaignsData = await campaignsResponse.json();
    
    // جلب إحصائيات الحساب
    const statsResponse = await fetch(
      `https://adsapi.snapchat.com/v1/adaccounts/${accountId}/stats?granularity=TOTAL&start_time=${startDate}&end_time=${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let stats = null;
    if (statsResponse.ok) {
      stats = await statsResponse.json();
    }

    return {
      campaigns: campaignsData.campaigns || [],
      stats: stats,
      error: null
    };
  } catch (error) {
    console.error('Error fetching Snapchat data:', error);
    return { error: String(error), campaigns: [], stats: null };
  }
}

// جلب بيانات TikTok
async function fetchTikTokData(accessToken: string, accountId: string, startDate: string, endDate: string) {
  try {
    const response = await fetch(
      `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/`,
      {
        method: 'POST',
        headers: {
          'Access-Token': accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          advertiser_id: accountId,
          report_type: 'BASIC',
          dimensions: ['stat_time_day'],
          metrics: ['spend', 'conversion', 'total_purchase_value'],
          data_level: 'AUCTION_ADVERTISER',
          start_date: startDate,
          end_date: endDate
        })
      }
    );

    if (!response.ok) {
      return { error: `TikTok API Error: ${response.status}`, data: null };
    }

    const data = await response.json();
    return { data: data.data, error: null };
  } catch (error) {
    console.error('Error fetching TikTok data:', error);
    return { error: String(error), data: null };
  }
}

// جلب بيانات Meta
async function fetchMetaData(accessToken: string, accountId: string, startDate: string, endDate: string) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/act_${accountId}/insights?fields=spend,actions,action_values&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${accessToken}`
    );

    if (!response.ok) {
      return { error: `Meta API Error: ${response.status}`, data: null };
    }

    const data = await response.json();
    return { data: data.data, error: null };
  } catch (error) {
    console.error('Error fetching Meta data:', error);
    return { error: String(error), data: null };
  }
}

// جلب بيانات Google
async function fetchGoogleData(accessToken: string, accountId: string, startDate: string, endDate: string) {
  try {
    const response = await fetch(
      `https://googleads.googleapis.com/v14/customers/${accountId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || ''
        },
        body: JSON.stringify({
          query: `
            SELECT 
              metrics.cost_micros,
              metrics.conversions,
              metrics.conversions_value
            FROM customer
            WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
          `
        })
      }
    );

    if (!response.ok) {
      return { error: `Google API Error: ${response.status}`, data: null };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching Google data:', error);
    return { error: String(error), data: null };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id;
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('range') || 'week';

    // حساب التواريخ
    const endDate = new Date();
    let startDate = new Date();
    
    switch (dateRange) {
      case 'today':
        startDate = new Date();
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(startDate.getDate() - 30);
        break;
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // قراءة tokens
    const allTokens = readTokens();
    const storeTokens = allTokens[storeId] || {};

    const results: {
      snapchat?: any;
      tiktok?: any;
      meta?: any;
      google?: any;
      summary: {
        sales: number;
        revenue: number;
        spend: number;
        roas: number;
      };
    } = {
      summary: {
        sales: 0,
        revenue: 0,
        spend: 0,
        roas: 0
      }
    };

    // جلب بيانات Snapchat
    if (storeTokens.snapchat) {
      const snapData = await fetchSnapchatData(
        storeTokens.snapchat.accessToken,
        storeTokens.snapchat.accountId,
        startDateStr,
        endDateStr
      );
      results.snapchat = snapData;
      
      // تجميع الإحصائيات من Snapchat
      if (snapData.stats?.total_stats) {
        const stats = snapData.stats.total_stats;
        results.summary.spend += (stats.spend || 0) / 1000000; // تحويل من micro
        results.summary.sales += stats.swipe_up_purchases || stats.purchases || 0;
        results.summary.revenue += (stats.swipe_up_purchase_value || stats.purchase_value || 0) / 1000000;
      }
    }

    // جلب بيانات TikTok
    if (storeTokens.tiktok) {
      const tiktokData = await fetchTikTokData(
        storeTokens.tiktok.accessToken,
        storeTokens.tiktok.accountId,
        startDateStr,
        endDateStr
      );
      results.tiktok = tiktokData;
      
      if (tiktokData.data?.list) {
        tiktokData.data.list.forEach((item: any) => {
          results.summary.spend += parseFloat(item.metrics?.spend || 0);
          results.summary.sales += parseInt(item.metrics?.conversion || 0);
          results.summary.revenue += parseFloat(item.metrics?.total_purchase_value || 0);
        });
      }
    }

    // جلب بيانات Meta
    if (storeTokens.meta) {
      const metaData = await fetchMetaData(
        storeTokens.meta.accessToken,
        storeTokens.meta.accountId,
        startDateStr,
        endDateStr
      );
      results.meta = metaData;
      
      if (metaData.data) {
        metaData.data.forEach((item: any) => {
          results.summary.spend += parseFloat(item.spend || 0);
          const purchases = item.actions?.find((a: any) => a.action_type === 'purchase');
          const purchaseValue = item.action_values?.find((a: any) => a.action_type === 'purchase');
          results.summary.sales += parseInt(purchases?.value || 0);
          results.summary.revenue += parseFloat(purchaseValue?.value || 0);
        });
      }
    }

    // جلب بيانات Google
    if (storeTokens.google) {
      const googleData = await fetchGoogleData(
        storeTokens.google.accessToken,
        storeTokens.google.accountId,
        startDateStr,
        endDateStr
      );
      results.google = googleData;
      
      if (googleData.data) {
        // معالجة بيانات Google
        results.summary.spend += (googleData.data.metrics?.cost_micros || 0) / 1000000;
        results.summary.sales += googleData.data.metrics?.conversions || 0;
        results.summary.revenue += googleData.data.metrics?.conversions_value || 0;
      }
    }

    // حساب ROAS
    if (results.summary.spend > 0) {
      results.summary.roas = results.summary.revenue / results.summary.spend;
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ 
      error: String(error),
      summary: { sales: 0, revenue: 0, spend: 0, roas: 0 }
    }, { status: 500 });
  }
}
