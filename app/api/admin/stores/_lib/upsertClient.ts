/**
 * upsertClient — إنشاء أو تحديث عميل بناءً على رقم الجوال (المعرّف الفعلي)
 *
 * المنطق:
 *  1. تنظيف رقم الجوال
 *  2. البحث عن عميل بنفس الجوال
 *  3. إذا موجود → تحديث الاسم/الإيميل إذا كانت أحدث
 *  4. إذا غير موجود → إنشاء عميل جديد
 *  5. ربط المتجر بالعميل عبر client_id
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface UpsertClientInput {
  owner_name:  string;
  owner_phone: string;
  owner_email?: string | null;
}

export interface UpsertClientResult {
  clientId:  string;
  action:    'created' | 'linked' | 'skipped';
}

/** تنظيف رقم الجوال — يبقي الأرقام و + فقط */
export function cleanPhone(raw: string): string {
  return raw.replace(/[^0-9+]/g, '').trim();
}

export async function upsertClient(
  supabase: SupabaseClient,
  input: UpsertClientInput,
  storeId?: string,
): Promise<UpsertClientResult | null> {
  const phone = cleanPhone(input.owner_phone);
  if (!phone) return null;

  // ── 1. البحث بالجوال ─────────────────────────────────────
  const { data: existing } = await supabase
    .from('clients')
    .select('id, name, email')
    .eq('phone', phone)
    .maybeSingle();

  let clientId: string;
  let action: UpsertClientResult['action'];

  if (existing) {
    clientId = existing.id;
    action   = 'linked';

    // ── 2. تحديث الاسم/الإيميل إذا كانت فارغة ────────────
    const updates: Record<string, string> = {};
    if (!existing.name  && input.owner_name)  updates.name  = input.owner_name;
    if (!existing.email && input.owner_email) updates.email = input.owner_email;
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      await supabase.from('clients').update(updates).eq('id', clientId);
    }
  } else {
    // ── 3. إنشاء عميل جديد ────────────────────────────────
    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({
        name:       input.owner_name  || phone,
        phone,
        email:      input.owner_email || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !newClient) return null;
    clientId = newClient.id;
    action   = 'created';
  }

  // ── 4. ربط المتجر بالعميل ─────────────────────────────
  if (storeId) {
    await supabase
      .from('stores')
      .update({ client_id: clientId })
      .eq('id', storeId);
  }

  return { clientId, action };
}
