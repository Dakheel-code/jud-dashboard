/**
 * POST /api/integrations/tiktok/select-account
 * حفظ الحساب الإعلاني المختار للمتجر في ad_platform_accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { encrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

function resolveUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storeId, ad_account_id, ad_account_name } = body;

    if (!storeId || !ad_account_id || !ad_account_name) {
      return NextResponse.json({ success: false, error: 'storeId, ad_account_id, ad_account_name مطلوبة' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ── 1. تحويل storeId إلى UUID ──────────────────────
    let resolvedId = storeId;
    if (!resolveUuid(storeId)) {
      const { data: row, error: rowErr } = await supabase
        .from('stores').select('id').eq('store_url', storeId).single();
      if (rowErr || !row?.id) {
        return NextResponse.json({ success: false, error: `المتجر غير موجود: ${storeId}` }, { status: 404 });
      }
      resolvedId = row.id;
    }

    // ── 2. جلب التوكن من tiktok_connections ────────────
    const { data: conn, error: connErr } = await supabase
      .from('tiktok_connections')
      .select('access_token')
      .eq('store_id', resolvedId)
      .eq('is_active', true)
      .order('connected_at', { ascending: false })
      .limit(1)
      .single();

    if (connErr || !conn?.access_token) {
      return NextResponse.json({
        success: false,
        error: 'لم يُعثر على التوكن. يرجى إعادة الربط مع TikTok.',
        debug: { resolvedId, connErr: connErr?.message }
      }, { status: 400 });
    }

    // ── 3. تشفير التوكن ────────────────────────────────
    const encToken = encrypt(conn.access_token);

    // ── 4. حذف السجل القديم إن وُجد ثم إدراج جديد ──────
    await supabase
      .from('ad_platform_accounts')
      .delete()
      .eq('store_id', resolvedId)
      .eq('platform', 'tiktok');

    const { error: insertErr } = await supabase
      .from('ad_platform_accounts')
      .insert({
        store_id: resolvedId,
        platform: 'tiktok',
        ad_account_id,
        ad_account_name,
        access_token_enc: encToken,
        status: 'connected',
        scopes: [],
        token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_connected_at: new Date().toISOString(),
        error_message: null,
      });

    if (insertErr) {
      return NextResponse.json({ success: false, error: insertErr.message, debug: { resolvedId } }, { status: 500 });
    }

    // ── 5. جلب store_url للتوجيه ───────────────────────
    const { data: store } = await supabase
      .from('stores').select('store_url').eq('id', resolvedId).single();

    return NextResponse.json({
      success: true,
      redirect: `/admin/store/${store?.store_url || resolvedId}`,
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
