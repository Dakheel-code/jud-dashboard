/**
 * GET /api/meta/connect?storeId=...
 * يولّد OAuth URL ويوجّه المستخدم إلى Meta Login Dialog
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildOAuthUrl } from '@/lib/meta/client';
import crypto from 'crypto';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');
  if (!storeId) {
    return NextResponse.json({ error: 'storeId مطلوب' }, { status: 400 });
  }

  // تحقق أن المتجر موجود
  const supabase = getSupabase();
  const { data: store, error } = await supabase
    .from('stores')
    .select('id')
    .eq('id', storeId)
    .single();

  if (error || !store) {
    return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 });
  }

  // توليد state عشوائي (CSRF protection) — يحمل storeId مشفراً
  const nonce   = crypto.randomBytes(16).toString('hex');
  const state   = Buffer.from(JSON.stringify({ storeId, nonce })).toString('base64url');

  // حفظ state في DB مؤقتاً (صالح 10 دقائق)
  await supabase.from('meta_oauth_states').upsert({
    state,
    store_id:   storeId,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  const oauthUrl = buildOAuthUrl(state);
  return NextResponse.redirect(oauthUrl);
}
