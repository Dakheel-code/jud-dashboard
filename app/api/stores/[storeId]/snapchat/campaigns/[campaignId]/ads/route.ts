/**
 * GET /api/stores/[storeId]/snapchat/campaigns/[campaignId]/ads?squadId=XXX
 * جلب إعلانات squad محدد مع creatives بشكل parallel
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

const SNAP = 'https://adsapi.snapchat.com/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string; campaignId: string } }
) {
  try {
    let { storeId } = params;
    const squadId = request.nextUrl.searchParams.get('squadId') || '';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'DB not configured' }, { status: 503 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    // تحويل storeId إلى UUID إذا لزم
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
    if (!isUuid) {
      const { data: row } = await supabase.from('stores').select('id').eq('store_url', storeId).single();
      if (row?.id) storeId = row.id;
    }

    const { data: integration } = await supabase
      .from('ad_platform_accounts')
      .select('*')
      .eq('store_id', storeId)
      .eq('platform', 'snapchat')
      .single();

    if (!integration?.access_token_enc) {
      return NextResponse.json({ success: false, error: 'No connected Snapchat account' }, { status: 400 });
    }

    const accessToken = decrypt(integration.access_token_enc);
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Token decrypt failed' }, { status: 401 });
    }

    const h = { Authorization: `Bearer ${accessToken}` };

    // جلب الإعلانات مباشرة من الـ squad المحدد
    const targetSquadId = squadId;
    if (!targetSquadId) {
      return NextResponse.json({ success: false, error: 'squadId required' }, { status: 400 });
    }

    const adsRes = await fetch(`${SNAP}/adsquads/${targetSquadId}/ads`, { headers: h });
    if (!adsRes.ok) {
      return NextResponse.json({ success: false, error: 'Failed to fetch ads' }, { status: adsRes.status });
    }
    const adsData = await adsRes.json();
    const rawAds: any[] = (adsData.ads || []).map((w: any) => w.ad).filter(Boolean);

    // جلب كل الـ creatives بشكل parallel
    const creativeIds = [...new Set(rawAds.map((a: any) => a.creative_id).filter(Boolean))];
    const creativeMap: Record<string, any> = {};

    await Promise.all(
      creativeIds.map(async (cid) => {
        try {
          const res = await fetch(`${SNAP}/creatives/${cid}`, { headers: h });
          if (res.ok) {
            const data = await res.json();
            const c = data.creatives?.[0]?.creative;
            if (c) creativeMap[cid] = c;
          }
        } catch {}
      })
    );

    // جلب الـ media للـ creatives التي تحتوي top_snap_media_id — بشكل parallel
    const mediaIds = [...new Set(
      Object.values(creativeMap)
        .map((c: any) => c.top_snap_media_id)
        .filter(Boolean)
    )];
    const mediaMap: Record<string, any> = {};

    await Promise.all(
      mediaIds.map(async (mid) => {
        try {
          const res = await fetch(`${SNAP}/media/${mid}`, { headers: h });
          if (res.ok) {
            const data = await res.json();
            const m = data.media?.[0]?.media;
            if (m) mediaMap[mid] = m;
          }
        } catch {}
      })
    );

    // بناء النتيجة
    const ads = rawAds.map((ad: any) => {
      const creative = ad.creative_id ? creativeMap[ad.creative_id] : null;
      const media = creative?.top_snap_media_id ? mediaMap[creative.top_snap_media_id] : null;

      const thumbnailUrl =
        creative?.preview_creative ||
        creative?.preview_media_url ||
        media?.thumbnail_url ||
        media?.image_url ||
        (media?.type === 'IMAGE' ? (media?.download_link || media?.media_url) : null) ||
        null;

      return {
        id: ad.id,
        name: ad.name,
        status: ad.status,
        type: ad.type,
        ad_squad_id: targetSquadId,
        creative_id: ad.creative_id,
        media_url: media?.download_link || media?.media_url || null,
        media_type: media?.type || null,
        thumbnail_url: thumbnailUrl,
      };
    });

    return NextResponse.json({ success: true, ads });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
