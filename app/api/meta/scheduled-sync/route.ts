/**
 * POST /api/meta/scheduled-sync
 * Scheduled job — يُشغَّل كل 6-12 ساعة
 * يمزامن جميع المتاجر المرتبطة بـ Meta تلقائياً
 *
 * الحماية: CRON_SECRET header (لا يُستدعى من المتصفح)
 * الاستخدام: Netlify Scheduled Function أو GitHub Actions cron
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchAds, fetchInsights } from '@/lib/meta/client';
import { decryptToken } from '@/lib/meta/encryption';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // جلب جميع الاتصالات النشطة التي لديها ad_account_id
  const { data: connections, error } = await supabase
    .from('store_meta_connections')
    .select('store_id, ad_account_id, access_token_encrypted, last_sync_at')
    .eq('status', 'active')
    .not('ad_account_id', 'is', null);

  if (error || !connections?.length) {
    return NextResponse.json({ synced: 0, message: 'لا توجد اتصالات نشطة' });
  }

  const results: { storeId: string; ads: number; insights: number; error?: string }[] = [];

  for (const conn of connections) {
    try {
      const token = decryptToken(conn.access_token_encrypted);

      // ─── مزامنة الإعلانات ───────────────────────────────
      const ads = await fetchAds(conn.ad_account_id, token);
      if (ads.length > 0) {
        const adRows = ads.map((ad: any) => ({
          store_id:             conn.store_id,
          ad_account_id:        conn.ad_account_id,
          ad_id:                ad.id,
          ad_name:              ad.name || null,
          campaign_id:          ad.campaign?.id || null,
          campaign_name:        ad.campaign?.name || null,
          adset_id:             ad.adset?.id || null,
          adset_name:           ad.adset?.name || null,
          status:               ad.status || null,
          effective_status:     ad.effective_status || null,
          creative_preview_url: ad.creative?.thumbnail_url || null,
          updated_at:           new Date().toISOString(),
        }));
        await supabase
          .from('meta_ads_cache')
          .upsert(adRows, { onConflict: 'ad_account_id,ad_id' });
      }

      // ─── مزامنة الإحصائيات (آخر 7 أيام) ────────────────
      const insights = await fetchInsights(conn.ad_account_id, token, 'last_7d');
      if (insights.length > 0) {
        const insRows = insights.map((ins: any) => ({
          store_id:            conn.store_id,
          ad_account_id:       conn.ad_account_id,
          ad_id:               ins.ad_id || null,
          campaign_id:         ins.campaign_id || null,
          date_start:          ins.date_start,
          date_stop:           ins.date_stop,
          spend:               parseFloat(ins.spend || '0'),
          impressions:         parseInt(ins.impressions || '0', 10),
          clicks:              parseInt(ins.clicks || '0', 10),
          reach:               parseInt(ins.reach || '0', 10),
          ctr:                 parseFloat(ins.ctr || '0'),
          cpc:                 parseFloat(ins.cpc || '0'),
          cpm:                 parseFloat(ins.cpm || '0'),
          conversions:         parseInt(ins.conversions || '0', 10),
          cost_per_conversion: parseFloat(ins.cost_per_conversion || '0'),
          currency:            ins.account_currency || 'SAR',
          updated_at:          new Date().toISOString(),
        }));
        await supabase
          .from('meta_insights_cache')
          .upsert(insRows, { onConflict: 'ad_account_id,ad_id,date_start,date_stop' });
      }

      // تحديث last_sync_at
      await supabase
        .from('store_meta_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('store_id', conn.store_id);

      results.push({ storeId: conn.store_id, ads: ads.length, insights: insights.length });

    } catch (err: any) {
      // إذا انتهى التوكن — حدّث الحالة إلى error
      if (err.message?.includes('OAuthException') || err.message?.includes('token')) {
        await supabase
          .from('store_meta_connections')
          .update({ status: 'error' })
          .eq('store_id', conn.store_id);
      }
      results.push({ storeId: conn.store_id, ads: 0, insights: 0, error: err.message });
    }
  }

  const succeeded = results.filter(r => !r.error).length;
  const failed    = results.filter(r => r.error).length;

  return NextResponse.json({
    total:     connections.length,
    succeeded,
    failed,
    results,
    timestamp: new Date().toISOString(),
  });
}
