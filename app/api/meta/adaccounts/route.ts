/**
 * GET /api/meta/adaccounts?storeId=...
 * يجلب قائمة الحسابات الإعلانية للمستخدم المرتبط بالمتجر
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAdAccounts } from '@/lib/meta/client';
import { decryptToken } from '@/lib/meta/encryption';
import { requireMetaManage } from '@/lib/meta/guard';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const guard = await requireMetaManage();
  if (!guard.ok) return guard.error!;

  const storeId = request.nextUrl.searchParams.get('storeId');
  if (!storeId) {
    return NextResponse.json({ error: 'storeId مطلوب' }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: conn, error } = await supabase
    .from('store_meta_connections')
    .select('access_token_encrypted, status')
    .eq('store_id', storeId)
    .eq('status', 'active')
    .single();

  if (error || !conn) {
    return NextResponse.json({ error: 'لا يوجد ربط نشط لهذا المتجر' }, { status: 404 });
  }

  try {
    const token = decryptToken(conn.access_token_encrypted);
    const accounts = await getAdAccounts(token);

    return NextResponse.json({ accounts });
  } catch (err: any) {
    console.error('Meta adaccounts error:', err.message);
    return NextResponse.json({ error: 'فشل جلب الحسابات الإعلانية' }, { status: 500 });
  }
}
