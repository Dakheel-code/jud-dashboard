/**
 * GET /api/admin/ads?source=all|meta|snapchat&storeId=...&page=1&limit=50
 * جدول إعلانات موحّد — يقرأ من cache فقط لضمان السرعة
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const source  = searchParams.get('source')  || 'all';
  const storeId = searchParams.get('storeId') || null;
  const page    = Math.max(1, parseInt(searchParams.get('page')  || '1'));
  const limit   = Math.min(100, parseInt(searchParams.get('limit') || '50'));
  const offset  = (page - 1) * limit;

  const supabase = getSupabase();
  const rows: any[] = [];

  // ─── Meta Ads ──────────────────────────────────────────────────────────────
  if (source === 'all' || source === 'meta') {
    let q = supabase
      .from('meta_ads_cache')
      .select(`
        ad_id, ad_name, campaign_id, campaign_name,
        adset_id, adset_name, status, effective_status,
        store_id, ad_account_id, updated_at
      `)
      .order('updated_at', { ascending: false });

    if (storeId) q = q.eq('store_id', storeId);

    // جلب insights لكل إعلان (آخر 7 أيام)
    const { data: metaAds } = await q.range(0, 499);

    if (metaAds && metaAds.length > 0) {
      // جلب insights دفعة واحدة
      const adIds = metaAds.map(a => a.ad_id);
      let insQ = supabase
        .from('meta_insights_cache')
        .select('ad_id, spend, impressions, clicks, ctr, cpc, currency')
        .in('ad_id', adIds)
        .order('date_start', { ascending: false });

      const { data: insights } = await insQ;
      const insMap = new Map<string, any>();
      (insights || []).forEach(ins => {
        if (!insMap.has(ins.ad_id)) insMap.set(ins.ad_id, ins);
      });

      metaAds.forEach(ad => {
        const ins = insMap.get(ad.ad_id);
        rows.push({
          platform:       'meta',
          ad_id:          ad.ad_id,
          ad_name:        ad.ad_name || '—',
          campaign_id:    ad.campaign_id,
          campaign_name:  ad.campaign_name || '—',
          adset_id:       ad.adset_id,
          adset_name:     ad.adset_name || '—',
          status:         ad.effective_status || ad.status || '—',
          store_id:       ad.store_id,
          spend:          ins?.spend       ?? null,
          impressions:    ins?.impressions ?? null,
          clicks:         ins?.clicks      ?? null,
          ctr:            ins?.ctr         ?? null,
          cpc:            ins?.cpc         ?? null,
          currency:       ins?.currency    || 'SAR',
          last_sync:      ad.updated_at,
        });
      });
    }
  }

  // ─── Snapchat Ads ──────────────────────────────────────────────────────────
  if (source === 'all' || source === 'snapchat') {
    let q = supabase
      .from('snapchat_ads_cache')
      .select(`
        ad_id, ad_name, campaign_id, campaign_name,
        adset_id, adset_name, status, effective_status,
        store_id, ad_account_id, updated_at,
        spend, impressions, clicks, swipes, roas
      `)
      .order('updated_at', { ascending: false });

    if (storeId) q = q.eq('store_id', storeId);

    const { data: snapAds } = await q.range(0, 499);

    (snapAds || []).forEach(ad => {
      rows.push({
        platform:       'snapchat',
        ad_id:          ad.ad_id,
        ad_name:        ad.ad_name || '—',
        campaign_id:    ad.campaign_id,
        campaign_name:  ad.campaign_name || '—',
        adset_id:       ad.adset_id,
        adset_name:     ad.adset_name || '—',
        status:         ad.effective_status || ad.status || '—',
        store_id:       ad.store_id,
        spend:          ad.spend       ?? null,
        impressions:    ad.impressions ?? null,
        clicks:         ad.clicks ?? ad.swipes ?? null,
        ctr:            null,
        cpc:            null,
        currency:       'SAR',
        last_sync:      ad.updated_at,
      });
    });
  }

  // ─── ترتيب + pagination ────────────────────────────────────────────────────
  rows.sort((a, b) => new Date(b.last_sync).getTime() - new Date(a.last_sync).getTime());

  const total  = rows.length;
  const paged  = rows.slice(offset, offset + limit);

  return NextResponse.json({
    ads:   paged,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  });
}
