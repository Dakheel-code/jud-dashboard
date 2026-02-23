import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCampaigns } from '@/lib/tiktok';
import { decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('store_id');
  const sync    = req.nextUrl.searchParams.get('sync') === 'true';

  if (!storeId) {
    return NextResponse.json({ error: 'store_id مطلوب' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // تحويل storeId إلى UUID إذا لزم
    let resolvedStoreId = storeId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
    if (!isUuid) {
      const { data: row } = await supabase.from('stores').select('id').eq('store_url', storeId).single();
      if (row?.id) resolvedStoreId = row.id;
    }

    // جلب الحساب الإعلاني المختار من ad_platform_accounts
    const { data: integration } = await supabase
      .from('ad_platform_accounts')
      .select('ad_account_id, access_token_enc')
      .eq('store_id', resolvedStoreId)
      .eq('platform', 'tiktok')
      .eq('status', 'connected')
      .single();

    if (!integration?.ad_account_id || !integration?.access_token_enc) {
      return NextResponse.json({ connected: false, error: 'لا يوجد ربط نشط لـ TikTok' }, { status: 404 });
    }

    const advertiser_id = integration.ad_account_id;
    const access_token = decrypt(integration.access_token_enc);

    if (!access_token) {
      return NextResponse.json({ connected: false, error: 'انتهت صلاحية التوكن' }, { status: 401 });
    }

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
