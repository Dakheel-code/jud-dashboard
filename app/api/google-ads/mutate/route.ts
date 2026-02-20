import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createCampaign, updateCampaignStatus, amountToMicros } from '@/lib/google-ads';
import type { GoogleAdsConnection } from '@/types/google-ads';

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const body = await req.json();
    const { store_id, action, params } = body;

    if (!store_id || !action) {
      return NextResponse.json({ error: 'store_id و action مطلوبان' }, { status: 400 });
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
      return NextResponse.json({ connected: false, error: 'لا يوجد ربط نشط' }, { status: 404 });
    }

    const connection = connData as GoogleAdsConnection;
    let result: any;

    if (action === 'create_campaign') {
      result = await createCampaign(
        connection,
        params.name,
        params.channel_type,
        amountToMicros(params.budget),
        params.status ?? 'PAUSED'
      );
    } else if (action === 'update_status') {
      result = await updateCampaignStatus(connection, params.resource_name, params.status);
    } else {
      return NextResponse.json({ error: `action غير معروف: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (e: any) {
    console.error('Google Ads mutate error:', e);
    return NextResponse.json({ error: e.message || 'خطأ في تنفيذ العملية' }, { status: 500 });
  }
}
