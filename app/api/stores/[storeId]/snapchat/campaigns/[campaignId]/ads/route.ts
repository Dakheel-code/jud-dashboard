/**
 * GET /api/stores/[storeId]/snapchat/campaigns/[campaignId]/ads
 * 
 * جلب الإعلانات الفرعية (Ads) لحملة معينة مع الصور/الفيديوهات
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/integrations/token-manager';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SNAPCHAT_API_URL = 'https://adsapi.snapchat.com/v1';

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string; campaignId: string } }
) {
  try {
    const { storeId, campaignId } = params;

    console.log('=== Fetching Ads for Campaign ===', { storeId, campaignId });

    // جلب معلومات الحساب الإعلاني من Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'Missing Supabase config' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // جلب بيانات الربط
    const { data: integration } = await supabase
      .from('ad_platform_accounts')
      .select('ad_account_id')
      .eq('store_id', storeId)
      .eq('platform', 'snapchat')
      .eq('status', 'connected')
      .single();

    if (!integration?.ad_account_id) {
      return NextResponse.json({ success: false, error: 'No connected Snapchat account' }, { status: 400 });
    }

    // جلب توكن صالح
    const accessToken = await getValidAccessToken(storeId, 'snapchat');
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Token expired', needs_reauth: true }, { status: 401 });
    }

    const headers = { Authorization: `Bearer ${accessToken}` };

    // 1. جلب Ad Squads للحملة
    const adSquadsUrl = `${SNAPCHAT_API_URL}/campaigns/${campaignId}/adsquads`;
    console.log('Fetching ad squads:', adSquadsUrl);
    
    const adSquadsResponse = await fetch(adSquadsUrl, { headers });
    if (!adSquadsResponse.ok) {
      const errorData = await adSquadsResponse.json().catch(() => ({}));
      console.error('Ad Squads error:', errorData);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch ad squads',
        details: errorData
      }, { status: adSquadsResponse.status });
    }

    const adSquadsData = await adSquadsResponse.json();
    const adSquads = adSquadsData.adsquads || [];

    // 2. جلب الإعلانات لكل Ad Squad
    const allAds: any[] = [];
    
    for (const squad of adSquads) {
      const squadId = squad.adsquad?.id;
      if (!squadId) continue;

      const adsUrl = `${SNAPCHAT_API_URL}/adsquads/${squadId}/ads`;
      console.log('Fetching ads for squad:', squadId);
      
      const adsResponse = await fetch(adsUrl, { headers });
      if (adsResponse.ok) {
        const adsData = await adsResponse.json();
        const ads = adsData.ads || [];
        
        for (const adWrapper of ads) {
          const ad = adWrapper.ad;
          if (!ad) continue;

          // جلب Creative للحصول على الصورة/الفيديو
          let mediaUrl = null;
          let mediaType = null;
          let thumbnailUrl = null;

          if (ad.creative_id) {
            try {
              const creativeUrl = `${SNAPCHAT_API_URL}/creatives/${ad.creative_id}`;
              const creativeResponse = await fetch(creativeUrl, { headers });
              
              if (creativeResponse.ok) {
                const creativeData = await creativeResponse.json();
                const creative = creativeData.creatives?.[0]?.creative;
                
                if (creative) {
                  // تحديد نوع الميديا
                  if (creative.top_snap_media_id) {
                    // جلب الميديا
                    const mediaId = creative.top_snap_media_id;
                    const mediaInfoUrl = `${SNAPCHAT_API_URL}/media/${mediaId}`;
                    const mediaResponse = await fetch(mediaInfoUrl, { headers });
                    
                    if (mediaResponse.ok) {
                      const mediaData = await mediaResponse.json();
                      const media = mediaData.media?.[0]?.media;
                      
                      if (media) {
                        mediaType = media.type; // VIDEO or IMAGE
                        mediaUrl = media.download_link || media.media_url;
                        thumbnailUrl = media.thumbnail_url;
                      }
                    }
                  }
                  
                  // بديل: استخدام preview_creative
                  if (!mediaUrl && creative.preview_creative) {
                    thumbnailUrl = creative.preview_creative;
                  }
                }
              }
            } catch (err) {
              console.error('Error fetching creative:', err);
            }
          }

          allAds.push({
            id: ad.id,
            name: ad.name,
            status: ad.status,
            type: ad.type,
            ad_squad_id: squadId,
            ad_squad_name: squad.adsquad?.name,
            creative_id: ad.creative_id,
            media_url: mediaUrl,
            media_type: mediaType,
            thumbnail_url: thumbnailUrl,
            created_at: ad.created_at,
            updated_at: ad.updated_at,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      campaign_id: campaignId,
      ad_squads_count: adSquads.length,
      ads_count: allAds.length,
      ads: allAds,
    });

  } catch (error: any) {
    console.error('Error fetching campaign ads:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
    }, { status: 500 });
  }
}
