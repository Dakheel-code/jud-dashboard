/**
 * Token Manager - إدارة التوكنات وتجديدها
 */

import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from '../encryption';
import * as snapchat from './snapchat';

type Platform = 'snapchat' | 'tiktok' | 'meta' | 'google';

interface TokenRecord {
  id: string;
  store_id: string;
  platform: Platform;
  status: string;
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  token_expires_at: string | null;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * جلب توكن صالح (مع تجديد تلقائي إذا انتهى)
 */
export async function getValidAccessToken(
  storeId: string,
  platform: Platform
): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  // جلب سجل التوكن
  const { data: record, error } = await supabase
    .from('ad_platform_accounts')
    .select('*')
    .eq('store_id', storeId)
    .eq('platform', platform)
    .single();

  if (error || !record) {
    return null;
  }

  if (!record.access_token_enc) {
    return null;
  }

  // التحقق من صلاحية التوكن
  const expiresAt = record.token_expires_at ? new Date(record.token_expires_at) : null;
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  // إذا التوكن صالح
  if (expiresAt && expiresAt > fiveMinutesFromNow) {
    return decrypt(record.access_token_enc);
  }

  // التوكن منتهي أو قارب على الانتهاء - نحتاج تجديد
  if (!record.refresh_token_enc) {
    // لا يوجد refresh token - نحتاج إعادة ربط
    await supabase
      .from('ad_platform_accounts')
      .update({ status: 'needs_reauth', error_message: 'Token expired and no refresh token available' })
      .eq('id', record.id);
    return null;
  }

  try {
    const refreshTokenDecrypted = decrypt(record.refresh_token_enc);
    let newTokens;

    // تجديد التوكن حسب المنصة
    switch (platform) {
      case 'snapchat':
        newTokens = await snapchat.refreshToken({
          refreshToken: refreshTokenDecrypted,
          clientId: process.env.SNAPCHAT_CLIENT_ID!,
          clientSecret: process.env.SNAPCHAT_CLIENT_SECRET!,
        });
        break;
      // TODO: إضافة باقي المنصات
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // حفظ التوكنات الجديدة
    const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
    
    await supabase
      .from('ad_platform_accounts')
      .update({
        access_token_enc: encrypt(newTokens.access_token),
        refresh_token_enc: newTokens.refresh_token ? encrypt(newTokens.refresh_token) : record.refresh_token_enc,
        token_expires_at: newExpiresAt.toISOString(),
        status: 'connected',
        error_message: null,
      })
      .eq('id', record.id);

    return newTokens.access_token;
  } catch (err) {
    
    // تحديث الحالة إلى needs_reauth
    await supabase
      .from('ad_platform_accounts')
      .update({
        status: 'needs_reauth',
        error_message: err instanceof Error ? err.message : 'Token refresh failed',
      })
      .eq('id', record.id);

    return null;
  }
}

/**
 * حفظ التوكنات الجديدة
 */
export async function saveTokens(
  storeId: string,
  platform: Platform,
  tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    scopes?: string[];
    externalUserId?: string;
    externalDisplayName?: string;
  }
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

  const upsertData: Record<string, any> = {
    store_id: storeId,
    platform: platform,
    status: 'connected',
    access_token_enc: encrypt(tokens.accessToken),
    refresh_token_enc: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
    token_expires_at: expiresAt.toISOString(),
    scopes: tokens.scopes || [],
    last_connected_at: new Date().toISOString(),
    error_message: null,
  };

  if (tokens.externalUserId) upsertData.external_user_id = tokens.externalUserId;

  const { error } = await supabase
    .from('ad_platform_accounts')
    .upsert(upsertData, {
      onConflict: 'store_id,platform',
    });

  if (error) {
    throw new Error('Failed to save tokens');
  }
}

/**
 * حذف التوكنات (فصل الربط)
 */
export async function clearTokens(
  storeId: string,
  platform: Platform
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('ad_platform_accounts')
    .update({
      status: 'disconnected',
      access_token_enc: null,
      refresh_token_enc: null,
      token_expires_at: null,
      ad_account_id: null,
      ad_account_name: null,
      organization_id: null,
      error_message: null,
    })
    .eq('store_id', storeId)
    .eq('platform', platform);

  if (error) {
    throw new Error('Failed to clear tokens');
  }
}

/**
 * تحديث الحساب الإعلاني المختار
 */
export async function updateSelectedAdAccount(
  storeId: string,
  platform: Platform,
  adAccount: {
    id: string;
    name: string;
    organizationId?: string;
  }
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('ad_platform_accounts')
    .update({
      ad_account_id: adAccount.id,
      ad_account_name: adAccount.name,
      organization_id: adAccount.organizationId || null,
      status: 'connected',
      last_connected_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('store_id', storeId)
    .eq('platform', platform)
    .select('id');

  if (error) {
    throw new Error('Failed to update ad account');
  }

  if (!data || data.length === 0) {
    throw new Error('Ad platform token record not found. Please re-connect the platform.');
  }
}
