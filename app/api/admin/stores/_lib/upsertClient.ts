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

/**
 * تنظيف وتوحيد رقم الجوال السعودي
 * الصيغة الموحّدة: +966XXXXXXXXX (12 رقم بعد +)
 *
 * يدعم:
 *  05XXXXXXXX   → +96605XXXXXXXX  (خطأ شائع، يُبقى كما هو بعد إضافة +966)
 *  5XXXXXXXX    → +9665XXXXXXXX
 *  009665XXXXXXXX → +9665XXXXXXXX
 *  +9665XXXXXXXX  → +9665XXXXXXXX (صحيح مسبقاً)
 *  9665XXXXXXXX   → +9665XXXXXXXX
 */
export function cleanPhone(raw: string): string {
  // إزالة كل شيء عدا الأرقام
  let digits = raw.replace(/[^0-9]/g, '').trim();

  if (!digits) return '';

  // إزالة 00 من البداية (009665... → 9665...)
  if (digits.startsWith('00')) digits = digits.slice(2);

  // إذا يبدأ بـ 966 → أضف +
  if (digits.startsWith('966')) return '+' + digits;

  // إذا يبدأ بـ 05 → +9665... (نحذف الصفر الأول)
  if (digits.startsWith('05')) return '+966' + digits.slice(1);

  // إذا يبدأ بـ 5 → +9665...
  if (digits.startsWith('5')) return '+966' + digits;

  // غير ذلك → أضف + فقط
  return '+' + digits;
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
