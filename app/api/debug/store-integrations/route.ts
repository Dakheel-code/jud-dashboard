import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('storeId');
  if (!storeId) return NextResponse.json({ error: 'storeId required' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // تحويل إلى UUID
  let resolvedId = storeId;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId);
  if (!isUuid) {
    const { data } = await supabase.from('stores').select('id').eq('store_url', storeId).single();
    if (data?.id) resolvedId = data.id;
  }

  const [{ data: platforms }, { data: tiktokConn }, { data: snapConn }] = await Promise.all([
    supabase.from('ad_platform_accounts')
      .select('platform, status, ad_account_id, ad_account_name, access_token_enc')
      .eq('store_id', resolvedId),
    supabase.from('tiktok_connections')
      .select('advertiser_id, is_active, access_token')
      .eq('store_id', resolvedId),
    supabase.from('ad_platform_accounts')
      .select('*')
      .eq('store_id', resolvedId)
      .eq('platform', 'snapchat')
      .single(),
  ]);

  return NextResponse.json({
    resolvedId,
    ad_platform_accounts: platforms?.map(p => ({
      platform: p.platform,
      status: p.status,
      ad_account_id: p.ad_account_id,
      ad_account_name: p.ad_account_name,
      has_token: !!p.access_token_enc,
    })),
    tiktok_connections: tiktokConn?.map(t => ({
      advertiser_id: t.advertiser_id,
      is_active: t.is_active,
      has_token: !!t.access_token,
    })),
    snapchat_full: snapConn ? {
      status: snapConn.status,
      ad_account_id: snapConn.ad_account_id,
      has_access_token: !!snapConn.access_token_enc,
      has_refresh_token: !!snapConn.refresh_token_enc,
      token_expires_at: snapConn.token_expires_at,
    } : null,
  });
}
