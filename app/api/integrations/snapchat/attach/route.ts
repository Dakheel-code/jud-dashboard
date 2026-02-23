/**
 * POST /api/integrations/snapchat/attach
 *
 * يربط متجراً بحساب Snapchat سابق (بدون OAuth جديد)
 * Body: { storeId: string, identityKey: string }
 *
 * السيرفر يجلب أحدث سجل tokens لهذه الهوية
 * وينسخها للمتجر الجديد
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { decrypt, encrypt } from '@/lib/encryption';
import { listAdAccounts } from '@/lib/integrations/snapchat';

export const dynamic = 'force-dynamic';

const SNAPCHAT_API_URL = 'https://adsapi.snapchat.com/v1';
const SNAPCHAT_TOKEN_URL = 'https://accounts.snapchat.com/login/oauth2/access_token';

async function getRefreshedToken(source: any): Promise<string | null> {
  // إذا كان التوكن صالحاً استخدمه مباشرة
  if (source.access_token_enc && source.token_expires_at) {
    const expiresAt = new Date(source.token_expires_at);
    if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
      return decrypt(source.access_token_enc);
    }
  }
  // جدّد التوكن باستخدام refresh_token
  if (!source.refresh_token_enc) return null;
  try {
    const refreshToken = decrypt(source.refresh_token_enc);
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.SNAPCHAT_CLIENT_ID!,
      client_secret: process.env.SNAPCHAT_CLIENT_SECRET!,
    });
    const res = await fetch(SNAPCHAT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

async function getOrgIdFromToken(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${SNAPCHAT_API_URL}/me/organizations?with_ad_accounts=true`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const orgs = data.organizations || [];
    if (orgs.length === 0) return null;
    const org = orgs[0]?.organization || orgs[0];
    return org?.id || null;
  } catch {
    return null;
  }
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration missing');
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, identityKey } = body;

    if (!storeId || !identityKey) {
      return NextResponse.json(
        { error: 'storeId and identityKey are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // التحقق من وجود المتجر
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    // جلب أحدث سجل tokens لهذه الهوية
    // identityKey هو organization_id
    let { data: sourceRecords, error: sourceError } = await supabase
      .from('ad_platform_accounts')
      .select('*')
      .eq('platform', 'snapchat')
      .not('refresh_token_enc', 'is', null)
      .or(`external_user_id.eq.${identityKey},organization_id.eq.${identityKey}`)
      .order('updated_at', { ascending: false })
      .limit(1);

    // Fallback: إذا لم نجد بـ organization_id (سجلات قديمة بدون organization_id)
    // نبحث في كل السجلات ونتحقق من organization_id عبر Snapchat API
    if (!sourceError && (!sourceRecords || sourceRecords.length === 0)) {
      const { data: allRecords } = await supabase
        .from('ad_platform_accounts')
        .select('*')
        .eq('platform', 'snapchat')
        .not('refresh_token_enc', 'is', null)
        .is('organization_id', null)
        .order('updated_at', { ascending: false });

      for (const rec of allRecords || []) {
        if (!rec.access_token_enc) continue;
        try {
          const accessToken = decrypt(rec.access_token_enc);
          const orgId = await getOrgIdFromToken(accessToken);
          if (orgId === identityKey) {
            // حفظ organization_id في قاعدة البيانات
            await supabase
              .from('ad_platform_accounts')
              .update({ organization_id: orgId })
              .eq('id', rec.id);
            sourceRecords = [{ ...rec, organization_id: orgId }];
            break;
          }
        } catch { /* تجاهل */ }
      }
    }

    if (sourceError || !sourceRecords || sourceRecords.length === 0) {
      return NextResponse.json(
        { error: 'Identity not found or no valid tokens available' },
        { status: 404 }
      );
    }

    const source = sourceRecords[0];

    // حذف السجل القديم ثم إدراج جديد (لتجنب مشكلة constraint name في upsert)
    await supabase
      .from('ad_platform_accounts')
      .delete()
      .eq('store_id', storeId)
      .eq('platform', 'snapchat');

    const { error: insertError } = await supabase
      .from('ad_platform_accounts')
      .insert({
        store_id: storeId,
        platform: 'snapchat',
        status: 'connected',
        external_user_id: source.external_user_id,
        organization_id: source.organization_id,
        ad_account_id: source.ad_account_id,
        ad_account_name: source.ad_account_name,
        scopes: source.scopes,
        access_token_enc: source.access_token_enc,
        refresh_token_enc: source.refresh_token_enc,
        token_expires_at: source.token_expires_at,
        last_connected_at: new Date().toISOString(),
        error_message: null,
      });

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to attach account: ' + insertError.message },
        { status: 500 }
      );
    }

    // جلب Ad Accounts مباشرة من Snapchat API — مع تجديد التوكن إذا انتهى
    let adAccounts: { id: string; name: string; organization_id: string }[] = [];
    try {
      const validToken = await getRefreshedToken(source);
      if (validToken) {
        const result = await listAdAccounts({ accessToken: validToken });
        adAccounts = result.adAccounts.map(a => ({ id: a.id, name: a.name, organization_id: a.organization_id }));
      }
    } catch { /* تجاهل */ }

    return NextResponse.json({
      success: true,
      ad_account_id: source.ad_account_id,
      ad_account_name: source.ad_account_name,
      adAccounts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
