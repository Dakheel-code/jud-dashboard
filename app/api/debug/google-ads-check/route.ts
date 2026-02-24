import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId');

  const clientId       = process.env.GOOGLE_ADS_CLIENT_ID       || '';
  const clientSecret   = process.env.GOOGLE_ADS_CLIENT_SECRET   || '';
  const refreshToken   = process.env.GOOGLE_ADS_REFRESH_TOKEN   || '';
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';
  const managerId      = process.env.GOOGLE_ADS_MANAGER_ID      || '';

  // اختبار جلب access token
  let accessToken = '';
  let tokenError: any = null;
  try {
    const body = new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });
    const res = await fetch('https://www.googleapis.com/oauth2/v3/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = await res.json();
    if (res.ok) { accessToken = data.access_token; }
    else { tokenError = data; }
  } catch (e: any) { tokenError = e.message; }

  // جلب الربط من قاعدة البيانات
  let dbConn: any = null;
  let reportsResult: any = null;
  let reportsError: any = null;

  if (storeId) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await supabase
      .from('google_ads_connections')
      .select('customer_id, manager_id, is_active')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .limit(1)
      .single();
    dbConn = data;

    // اختبار query مباشر
    if (accessToken && data?.customer_id) {
      const end = new Date().toISOString().split('T')[0];
      const start = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      };
      if (managerId) headers['login-customer-id'] = managerId;

      try {
        const url = `https://googleads.googleapis.com/v18/customers/${data.customer_id}/googleAds:searchStream`;
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: `SELECT metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.impressions FROM campaign WHERE segments.date BETWEEN '${start}' AND '${end}' AND campaign.status != 'REMOVED' LIMIT 5`
          }),
        });
        const raw = await res.json();
        reportsResult = { status: res.status, sample: Array.isArray(raw) ? raw[0]?.results?.slice(0, 2) : raw };
      } catch (e: any) { reportsError = e.message; }
    }
  }

  return NextResponse.json({
    env: {
      token_ok:            !!accessToken,
      token_error:         tokenError,
      developer_token_set: !!developerToken,
      manager_id:          managerId || '(فارغ)',
    },
    db_connection: dbConn,
    reports_result: reportsResult,
    reports_error:  reportsError,
  });
}
