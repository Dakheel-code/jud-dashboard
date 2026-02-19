/**
 * Store Row Normalization & Auto-fix
 * Phase 4: Header Mapping + Auto-fixes + Dedup
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NormalizedStoreRow {
  store_url:               string;
  store_name:              string;
  owner_name:              string;
  owner_phone:             string;
  owner_email:             string;
  priority:                'high' | 'medium' | 'low';
  status:                  'new' | 'active' | 'paused' | 'expired';
  budget:                  number | null;
  category:                string;
  store_group_url:         string;
  subscription_start_date: string | null;
  account_manager_id:      string | null;
  media_buyer_id:          string | null;
  notes:                   string;
}

export interface RowIssue {
  field:   string;
  message: string;
  value?:  string;
}

export interface AutoFix {
  field:     string;
  action:    string;
  old_value: string;
  new_value: string;
}

export interface NormalizeResult {
  normalized: NormalizedStoreRow | null;
  errors:     RowIssue[];
  warnings:   RowIssue[];
  autofixes:  AutoFix[];
}

// ─── 1. Header Mapping ────────────────────────────────────────────────────────

/**
 * خريطة شاملة: كل قيمة تُعيد المفتاح القياسي
 * يدعم: عربي / إنجليزي / مرادفات / مسافات مختلفة
 */
const HEADER_MAP: Record<string, keyof NormalizedStoreRow> = {
  // store_url
  'store_url':                    'store_url',
  'رابط المتجر':                  'store_url',
  'رابط المتجر *':                'store_url',
  'الموقع':                       'store_url',
  'الرابط':                       'store_url',
  'url':                          'store_url',
  'store url':                    'store_url',
  'domain':                       'store_url',
  'website':                      'store_url',
  'link':                         'store_url',

  // store_name
  'store_name':                   'store_name',
  'اسم المتجر':                   'store_name',
  'المتجر':                       'store_name',
  'الاسم':                        'store_name',
  'store name':                   'store_name',
  'name':                         'store_name',
  'shop name':                    'store_name',

  // owner_name
  'owner_name':                   'owner_name',
  'اسم صاحب المتجر':              'owner_name',
  'اسم المالك':                   'owner_name',
  'المالك':                       'owner_name',
  'صاحب المتجر':                  'owner_name',
  'owner':                        'owner_name',
  'owner name':                   'owner_name',

  // owner_phone
  'owner_phone':                  'owner_phone',
  'رقم الجوال':                   'owner_phone',
  'الجوال':                       'owner_phone',
  'جوال':                         'owner_phone',
  'هاتف':                         'owner_phone',
  'رقم الهاتف':                   'owner_phone',
  'رقم':                          'owner_phone',
  'mobile':                       'owner_phone',
  'phone':                        'owner_phone',
  'phone number':                 'owner_phone',
  'tel':                          'owner_phone',

  // owner_email
  'owner_email':                  'owner_email',
  'البريد الإلكتروني':            'owner_email',
  'البريد':                       'owner_email',
  'ايميل':                        'owner_email',
  'إيميل':                        'owner_email',
  'email':                        'owner_email',
  'e-mail':                       'owner_email',
  'mail':                         'owner_email',

  // priority
  'priority':                     'priority',
  'الأولوية':                     'priority',
  'اولوية':                       'priority',
  'أولوية':                       'priority',

  // status
  'status':                       'status',
  'الحالة':                       'status',
  'حالة':                         'status',
  'state':                        'status',

  // budget
  'budget':                       'budget',
  'الميزانية':                    'budget',
  'ميزانية':                      'budget',
  'المبلغ':                       'budget',

  // category
  'category':                     'category',
  'التصنيف':                      'category',
  'تصنيف':                        'category',
  'القسم':                        'category',
  'نوع المتجر':                   'category',
  'type':                         'category',

  // store_group_url
  'store_group_url':              'store_group_url',
  'رابط قروب المتجر':             'store_group_url',
  'رابط القروب':                  'store_group_url',
  'القروب':                       'store_group_url',
  'group url':                    'store_group_url',
  'group link':                   'store_group_url',
  'whatsapp group':               'store_group_url',
  'telegram group':               'store_group_url',

  // subscription_start_date
  'subscription_start_date':      'subscription_start_date',
  'تاريخ بداية الاشتراك':         'subscription_start_date',
  'تاريخ الاشتراك':               'subscription_start_date',
  'تاريخ البداية':                'subscription_start_date',
  'بداية الاشتراك':               'subscription_start_date',
  'start date':                   'subscription_start_date',
  'subscription date':            'subscription_start_date',
  'date':                         'subscription_start_date',

  // account_manager_id
  'account_manager_id':           'account_manager_id',
  'account_manager':              'account_manager_id',
  'مدير الحساب':                  'account_manager_id',
  'مدير حساب':                    'account_manager_id',
  'account manager':              'account_manager_id',
  'am':                           'account_manager_id',
  'معرّف مدير الحساب (uuid)':     'account_manager_id',
  'معرف مدير الحساب':             'account_manager_id',

  // media_buyer_id
  'media_buyer_id':               'media_buyer_id',
  'media_buyer':                  'media_buyer_id',
  'الميديا باير':                 'media_buyer_id',
  'ميديا باير':                   'media_buyer_id',
  'media buyer':                  'media_buyer_id',
  'mb':                           'media_buyer_id',
  'معرّف الميديا باير (uuid)':    'media_buyer_id',
  'معرف الميديا باير':            'media_buyer_id',

  // notes
  'notes':                        'notes',
  'ملاحظات':                      'notes',
  'ملاحظة':                       'notes',
  'note':                         'notes',
  'comments':                     'notes',
  'تعليق':                        'notes',
};

/**
 * تطبيع مفتاح العمود: lowercase + trim + إزالة رموز غير مرئية
 */
function normalizeHeaderKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '') // رموز غير مرئية
    .replace(/\s+/g, ' ');
}

/**
 * تحويل صف خام (مفاتيح عربية أو إنجليزية) إلى مفاتيح قياسية
 */
function mapHeaders(raw: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    const normalizedKey = normalizeHeaderKey(key);
    const mappedKey = HEADER_MAP[normalizedKey] ?? normalizedKey;
    result[mappedKey] = val != null ? String(val).trim() : '';
  }
  return result;
}

// ─── 2. Auto-fix Helpers ──────────────────────────────────────────────────────

/** تحويل الأرقام العربية/الهندية إلى أرقام لاتينية */
function arabicToLatinDigits(str: string): string {
  return str
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0));
}

/** إزالة الرموز غير المرئية والمسافات الزائدة */
function cleanInvisible(str: string): string {
  return str
    .replace(/[\u200B-\u200D\uFEFF\u00A0\u200E\u200F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** تطبيع store_url */
function fixStoreUrl(raw: string): { value: string; fixes: AutoFix[] } {
  const fixes: AutoFix[] = [];
  let v = cleanInvisible(arabicToLatinDigits(raw)).toLowerCase();

  // إزالة http(s):// و www.
  const withoutProtocol = v.replace(/^https?:\/\//i, '').replace(/^www\./i, '');

  // إزالة / الأخيرة
  const withoutTrailingSlash = withoutProtocol.replace(/\/+$/, '');

  if (withoutTrailingSlash !== v) {
    fixes.push({ field: 'store_url', action: 'clean_url', old_value: v, new_value: withoutTrailingSlash });
    v = withoutTrailingSlash;
  }

  return { value: v, fixes };
}

/** تطبيع رقم الجوال السعودي → 05XXXXXXXX */
function fixPhone(raw: string): { value: string; fixes: AutoFix[]; warnings: RowIssue[] } {
  const fixes: AutoFix[]    = [];
  const warnings: RowIssue[] = [];

  let v = cleanInvisible(arabicToLatinDigits(raw));
  v = v.replace(/[\s\-().+]/g, '');

  const original = v;

  // +966XXXXXXXX → 0XXXXXXXX
  if (v.startsWith('00966')) v = '0' + v.slice(5);
  else if (v.startsWith('+966')) v = '0' + v.slice(4);
  else if (v.startsWith('966') && v.length === 12) v = '0' + v.slice(3);
  // 5XXXXXXXX (9 أرقام بدون صفر) → 05XXXXXXXX
  else if (/^5\d{8}$/.test(v)) v = '0' + v;

  if (v !== original) {
    fixes.push({ field: 'owner_phone', action: 'normalize_phone', old_value: original, new_value: v });
  }

  // تحقق من الصيغة النهائية
  if (v && !/^05\d{8}$/.test(v)) {
    warnings.push({ field: 'owner_phone', message: 'رقم الجوال لا يطابق الصيغة السعودية (05XXXXXXXX)', value: v });
  }

  return { value: v, fixes, warnings };
}

/** تطبيع البريد الإلكتروني */
function fixEmail(raw: string): { value: string; fixes: AutoFix[]; warnings: RowIssue[] } {
  const fixes: AutoFix[]    = [];
  const warnings: RowIssue[] = [];

  const original = cleanInvisible(raw);
  const lower    = original.toLowerCase();

  if (lower !== original) {
    fixes.push({ field: 'owner_email', action: 'lowercase_email', old_value: original, new_value: lower });
  }

  if (lower && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) {
    warnings.push({ field: 'owner_email', message: 'البريد الإلكتروني لا يبدو صحيحاً', value: lower });
  }

  return { value: lower, fixes, warnings };
}

/** تحويل الميزانية إلى رقم */
function fixBudget(raw: string): { value: number | null; fixes: AutoFix[]; warnings: RowIssue[] } {
  const fixes: AutoFix[]    = [];
  const warnings: RowIssue[] = [];

  if (!raw) return { value: null, fixes, warnings };

  const cleaned = arabicToLatinDigits(raw).replace(/[,،\s]/g, '').replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    warnings.push({ field: 'budget', message: 'الميزانية ليست رقماً صحيحاً', value: raw });
    return { value: null, fixes, warnings };
  }

  if (cleaned !== raw) {
    fixes.push({ field: 'budget', action: 'parse_number', old_value: raw, new_value: String(num) });
  }

  return { value: num, fixes, warnings };
}

/** تحويل التاريخ إلى ISO (YYYY-MM-DD) */
function fixDate(raw: string): { value: string | null; fixes: AutoFix[]; warnings: RowIssue[] } {
  const fixes: AutoFix[]    = [];
  const warnings: RowIssue[] = [];

  if (!raw) return { value: null, fixes, warnings };

  const cleaned = arabicToLatinDigits(cleanInvisible(raw));

  // صيغة DD/MM/YYYY أو DD-MM-YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const iso = `${dmyMatch[3]}-${dmyMatch[2].padStart(2,'0')}-${dmyMatch[1].padStart(2,'0')}`;
    fixes.push({ field: 'subscription_start_date', action: 'convert_date_format', old_value: cleaned, new_value: iso });
    return { value: iso, fixes, warnings };
  }

  // صيغة YYYY/MM/DD
  const ymdSlash = cleaned.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/);
  if (ymdSlash) {
    const iso = `${ymdSlash[1]}-${ymdSlash[2].padStart(2,'0')}-${ymdSlash[3].padStart(2,'0')}`;
    if (iso !== cleaned) fixes.push({ field: 'subscription_start_date', action: 'convert_date_format', old_value: cleaned, new_value: iso });
    return { value: iso, fixes, warnings };
  }

  // محاولة Date.parse
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    const iso = d.toISOString().split('T')[0];
    if (iso !== cleaned) fixes.push({ field: 'subscription_start_date', action: 'parse_date', old_value: cleaned, new_value: iso });
    return { value: iso, fixes, warnings };
  }

  warnings.push({ field: 'subscription_start_date', message: 'تنسيق التاريخ غير معروف — سيُتجاهل', value: raw });
  return { value: null, fixes, warnings };
}

/** تحويل الأولوية */
function mapPriority(raw: string): 'high' | 'medium' | 'low' {
  const v = arabicToLatinDigits(cleanInvisible(raw)).toLowerCase();
  if (['مرتفع','عالي','high','1','عالية'].includes(v)) return 'high';
  if (['منخفض','low','3','منخفضة'].includes(v))         return 'low';
  return 'medium';
}

/** تحويل الحالة */
function mapStatus(raw: string): 'new' | 'active' | 'paused' | 'expired' {
  const v = arabicToLatinDigits(cleanInvisible(raw)).toLowerCase();
  if (['نشط','نشطة','active','مفعّل','مفعل'].includes(v))    return 'active';
  if (['متوقف','موقوف','paused','موقف'].includes(v))          return 'paused';
  if (['منتهي','منتهية','expired','منتهى'].includes(v))       return 'expired';
  return 'new';
}

/** التحقق من UUID */
function isUUID(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

// ─── 3. Main Normalize Function ───────────────────────────────────────────────

export function normalizeStoreRow(raw: Record<string, unknown>): NormalizeResult {
  const errors:   RowIssue[] = [];
  const warnings: RowIssue[] = [];
  const autofixes: AutoFix[] = [];

  // تطبيع مفاتيح الصف
  const row = mapHeaders(raw);

  // ── store_url (مطلوب) ──────────────────────────────────────
  const rawUrl = row['store_url'] ?? '';
  if (!rawUrl) {
    errors.push({ field: 'store_url', message: 'رابط المتجر مطلوب', value: '' });
    return { normalized: null, errors, warnings, autofixes };
  }
  const { value: storeUrl, fixes: urlFixes } = fixStoreUrl(rawUrl);
  autofixes.push(...urlFixes);

  if (!storeUrl.includes('.')) {
    errors.push({ field: 'store_url', message: 'رابط المتجر لا يبدو صحيحاً (لا يحتوي على نقطة)', value: storeUrl });
    return { normalized: null, errors, warnings, autofixes };
  }

  // ── store_name ─────────────────────────────────────────────
  const storeName = cleanInvisible(row['store_name'] ?? '');
  if (!storeName) {
    warnings.push({ field: 'store_name', message: 'اسم المتجر فارغ — سيُجلب تلقائياً من الموقع' });
  }

  // ── owner_phone ────────────────────────────────────────────
  const rawPhone = row['owner_phone'] ?? '';
  const { value: ownerPhone, fixes: phoneFixes, warnings: phoneWarnings } = fixPhone(rawPhone);
  autofixes.push(...phoneFixes);
  warnings.push(...phoneWarnings);

  // ── owner_email ────────────────────────────────────────────
  const rawEmail = row['owner_email'] ?? '';
  const { value: ownerEmail, fixes: emailFixes, warnings: emailWarnings } = fixEmail(rawEmail);
  autofixes.push(...emailFixes);
  warnings.push(...emailWarnings);

  // ── priority ───────────────────────────────────────────────
  const rawPriority = row['priority'] ?? '';
  const priority    = mapPriority(rawPriority);
  if (rawPriority && rawPriority.toLowerCase() !== priority) {
    autofixes.push({ field: 'priority', action: 'map_value', old_value: rawPriority, new_value: priority });
  }

  // ── status ─────────────────────────────────────────────────
  const rawStatus = row['status'] ?? '';
  const status    = mapStatus(rawStatus);
  if (rawStatus && rawStatus.toLowerCase() !== status) {
    autofixes.push({ field: 'status', action: 'map_value', old_value: rawStatus, new_value: status });
  }

  // ── budget ─────────────────────────────────────────────────
  const { value: budget, fixes: budgetFixes, warnings: budgetWarnings } = fixBudget(row['budget'] ?? '');
  autofixes.push(...budgetFixes);
  warnings.push(...budgetWarnings);

  // ── subscription_start_date ────────────────────────────────
  const { value: subscriptionDate, fixes: dateFixes, warnings: dateWarnings } = fixDate(row['subscription_start_date'] ?? '');
  autofixes.push(...dateFixes);
  warnings.push(...dateWarnings);

  // ── account_manager_id ─────────────────────────────────────
  const rawAMId = cleanInvisible(row['account_manager_id'] ?? '');
  let accountManagerId: string | null = null;
  if (rawAMId) {
    if (isUUID(rawAMId)) {
      accountManagerId = rawAMId.toLowerCase();
    } else {
      warnings.push({ field: 'account_manager_id', message: 'ليس UUID صالحاً — سيُتجاهل', value: rawAMId });
    }
  }

  // ── media_buyer_id ─────────────────────────────────────────
  const rawMBId = cleanInvisible(row['media_buyer_id'] ?? '');
  let mediaBuyerId: string | null = null;
  if (rawMBId) {
    if (isUUID(rawMBId)) {
      mediaBuyerId = rawMBId.toLowerCase();
    } else {
      warnings.push({ field: 'media_buyer_id', message: 'ليس UUID صالحاً — سيُتجاهل', value: rawMBId });
    }
  }

  const normalized: NormalizedStoreRow = {
    store_url:               storeUrl,
    store_name:              storeName,
    owner_name:              cleanInvisible(row['owner_name'] ?? ''),
    owner_phone:             ownerPhone,
    owner_email:             ownerEmail,
    priority,
    status,
    budget,
    category:                cleanInvisible(row['category'] ?? ''),
    store_group_url:         cleanInvisible(row['store_group_url'] ?? ''),
    subscription_start_date: subscriptionDate,
    account_manager_id:      accountManagerId,
    media_buyer_id:          mediaBuyerId,
    notes:                   cleanInvisible(row['notes'] ?? ''),
  };

  return { normalized, errors, warnings, autofixes };
}

// ─── 4. Dedup Keys ────────────────────────────────────────────────────────────

/**
 * يعيد مفاتيح التكرار لصف مطبّع
 * يُستخدم للمقارنة مع قاعدة البيانات
 */
export interface DedupKeys {
  store_url:   string;
  owner_phone: string;
  owner_email: string;
}

export function getDedupKeys(row: NormalizedStoreRow): DedupKeys {
  return {
    store_url:   row.store_url,
    owner_phone: row.owner_phone,
    owner_email: row.owner_email,
  };
}

/**
 * يبحث عن تطابق في قاعدة البيانات بناءً على أي من المفاتيح الثلاثة
 * يعيد: { matched: true, matchedBy, existingId } أو { matched: false }
 */
export interface DedupMatch {
  matched:   boolean;
  matchedBy?: 'store_url' | 'owner_phone' | 'owner_email';
  existingId?: string;
}

export function findDedupMatch(
  keys: DedupKeys,
  existingStores: { id: string; store_url: string; owner_phone?: string | null; owner_email?: string | null }[]
): DedupMatch {
  // أولوية: store_url > owner_phone > owner_email
  for (const store of existingStores) {
    if (keys.store_url && store.store_url === keys.store_url) {
      return { matched: true, matchedBy: 'store_url', existingId: store.id };
    }
  }
  for (const store of existingStores) {
    if (keys.owner_phone && store.owner_phone && store.owner_phone === keys.owner_phone) {
      return { matched: true, matchedBy: 'owner_phone', existingId: store.id };
    }
  }
  for (const store of existingStores) {
    if (keys.owner_email && store.owner_email && store.owner_email === keys.owner_email) {
      return { matched: true, matchedBy: 'owner_email', existingId: store.id };
    }
  }
  return { matched: false };
}
