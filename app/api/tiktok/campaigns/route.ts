import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCampaigns } from '@/lib/tiktok';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('store_id');
  const sync    = req.nextUrl.searchParams.get('sync') === 'true';

  if (!storeId) {
    return NextResponse.json({ error: 'store_id مطلوب' }, { status: 400 });
  }

  try {
    const supabase = getSupabase();

    // جلب الربط النشط
    const { data: connections, error: connErr } = await supabase
      .from('tiktok_connections')
      .select('advertiser_id, access_token')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (connErr || !connections) {
      return NextResponse.json({ connected: false, error: 'لا يوجد ربط نشط' }, { status: 404 });
    }

    const { advertiser_id, access_token } = connections;

    // التحقق من الكاش (آخر ساعة) إذا لم يطلب sync
    if (!sync) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: cached } = await supabase
        .from('tiktok_campaigns_cache')
        .select('*')
        .eq('store_id', storeId)
        .gte('last_synced_at', oneHourAgo);

      if (cached && cached.length > 0) {
        return NextResponse.json({ source: 'cache', campaigns: cached, total: cached.length });
      }
    }

    // جلب من TikTok API
    const apiRes = await getCampaigns(access_token, advertiser_id);

    // توكن منتهي الصلاحية
    if (apiRes.code === 40105) {
      await supabase
        .from('tiktok_connections')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('store_id', storeId)
        .eq('advertiser_id', advertiser_id);

      return NextResponse.json({ error: 'انتهت صلاحية التوكن، يرجى إعادة الربط' }, { status: 401 });
    }

    if (apiRes.code !== 0) {
      console.error('[TikTok Campaigns] خطأ API:', apiRes.message);
      return NextResponse.json({ error: apiRes.message }, { status: 500 });
    }

    const campaigns = apiRes.data?.list ?? [];

    // حفظ في الكاش
    if (campaigns.length > 0) {
      const cacheRows = campaigns.map((c) => ({
        store_id: storeId,
        advertiser_id,
        campaign_id: c.campaign_id,
        campaign_name: c.campaign_name,
        objective_type: c.objective_type,
        budget: c.budget,
        budget_mode: c.budget_mode,
        status: c.operation_status || c.status,
        campaign_data: c,
        last_synced_at: new Date().toISOString(),
      }));

      await supabase
        .from('tiktok_campaigns_cache')
        .upsert(cacheRows, { onConflict: 'store_id,campaign_id' });
    }

    return NextResponse.json({ source: 'api', campaigns, total: campaigns.length });
  } catch (error: any) {
    console.error('[TikTok Campaigns] خطأ غير متوقع:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
