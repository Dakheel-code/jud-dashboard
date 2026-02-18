/**
 * Snapchat OAuth Start - بدء عملية الربط
 * GET /api/integrations/snapchat/start?storeId=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUrl } from '@/lib/integrations/snapchat';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');
    const forceLogin = searchParams.get('force') === 'true';

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }


    // التحقق من المتغيرات البيئية
    const clientId = process.env.SNAPCHAT_CLIENT_ID;
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;

    if (!clientId) {
      return NextResponse.json({ error: 'Snapchat client ID not configured' }, { status: 503 });
    }

    if (!baseUrl) {
      return NextResponse.json({ error: 'App base URL not configured' }, { status: 503 });
    }

    const supabase = getSupabaseAdmin();

    // التحقق من وجود المتجر (يقبل UUID أو store_url)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storeId);

    const { data: store, error: storeError } = isUuid
      ? await supabase.from('stores').select('id').eq('id', storeId).single()
      : await supabase.from('stores').select('id').eq('store_url', storeId).single();

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // إنشاء state عشوائي للأمان
    const state = crypto.randomBytes(32).toString('hex');
    const redirectUri = `${baseUrl}/api/integrations/snapchat/callback`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 دقائق

    // حفظ state في قاعدة البيانات
    const { error: stateError } = await supabase
      .from('oauth_states')
      .insert({
        store_id: store.id,
        platform: 'snapchat',
        state: state,
        redirect_uri: redirectUri,
        expires_at: expiresAt.toISOString(),
      });

    if (stateError) {
      return NextResponse.json({ error: 'Failed to initiate OAuth' }, { status: 500 });
    }

    // بناء رابط التفويض
    const authUrl = getAuthUrl({
      redirectUri,
      state,
      clientId,
      forceLogin, // إجبار تسجيل دخول جديد عند الحاجة
    });

    // إعادة التوجيه إلى Snapchat
    return NextResponse.redirect(authUrl);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
