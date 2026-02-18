import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// جلب اسم المتجر من الموقع تلقائياً
async function fetchStoreNameFromUrl(storeUrl: string): Promise<string | null> {
  try {
    const url = storeUrl.startsWith('http') ? storeUrl : `https://${storeUrl}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // محاولة 1: og:site_name
    const ogSite = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
    if (ogSite?.[1]) return ogSite[1].trim();

    // محاولة 2: og:title
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (ogTitle?.[1]) return ogTitle[1].trim();

    // محاولة 3: <title>
    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (title?.[1]) return title[1].trim().split(/[|\-–]/)[0].trim();

    return null;
  } catch {
    return null;
  }
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// GET - تصدير المتاجر إلى JSON (سيتم تحويله لـ Excel في الفرونت)
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    const { data: stores, error } = await supabase
      .from('stores')
      .select(`
        store_name,
        store_url,
        owner_name,
        owner_phone,
        owner_email,
        priority,
        status,
        budget,
        notes,
        category,
        store_group_url,
        subscription_start_date,
        account_manager:admin_users!stores_account_manager_id_fkey(name),
        media_buyer:admin_users!stores_media_buyer_id_fkey(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'فشل في تصدير المتاجر' }, { status: 500 });
    }

    // تحويل البيانات لصيغة مناسبة للتصدير
    const exportData = stores.map((store: any) => ({
      'اسم المتجر': store.store_name || '',
      'رابط المتجر': store.store_url || '',
      'اسم صاحب المتجر': store.owner_name || '',
      'رقم الجوال': store.owner_phone || '',
      'البريد الإلكتروني': store.owner_email || '',
      'الأولوية': store.priority === 'high' ? 'مرتفع' : store.priority === 'low' ? 'منخفض' : 'متوسط',
      'الحالة': store.status === 'active' ? 'نشط' : store.status === 'paused' ? 'متوقف' : store.status === 'expired' ? 'منتهي' : 'جديد',
      'الميزانية': store.budget || '',
      'التصنيف': store.category || '',
      'رابط قروب المتجر': store.store_group_url || '',
      'تاريخ بداية الاشتراك': store.subscription_start_date || '',
      'مدير الحساب': store.account_manager?.name || '',
      'الميديا باير': store.media_buyer?.name || '',
      'ملاحظات': store.notes || ''
    }));

    return NextResponse.json({ stores: exportData });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// POST - استيراد المتاجر من JSON (قادم من Excel)
export async function POST(request: NextRequest) {
  try {
    const { stores } = await request.json();

    if (!stores || !Array.isArray(stores) || stores.length === 0) {
      return NextResponse.json({ error: 'لا توجد بيانات للاستيراد' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // جلب قائمة مديري الحسابات والميديا باير
    const { data: users } = await supabase
      .from('admin_users')
      .select('id, name');

    const userMap = new Map(users?.map(u => [u.name?.toLowerCase(), u.id]) || []);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // DEBUG: أول صف للتشخيص — يُرجع في الـ response
    const debugFirstRow = stores.length > 0 ? {
      keys: Object.keys(stores[0]),
      values: stores[0]
    } : null;

    for (const store of stores) {
      try {
        // دعم أسماء الأعمدة الإنجليزية (snake_case) والعربية معاً
        let storeName = store.store_name || store['اسم المتجر'] || '';
        const storeUrl = store.store_url || store['رابط المتجر'];
        const ownerName = store.owner_name || store['اسم صاحب المتجر'];
        const ownerPhone = store.owner_phone || store['رقم الجوال'];
        const ownerEmail = store.owner_email || store['البريد الإلكتروني'];
        const priorityAr = store.priority || store['الأولوية'];
        const statusAr = store.status || store['الحالة'];
        const budget = store.budget || store['الميزانية'];
        const category = store.category || store['التصنيف'];
        const storeGroupUrl = store.store_group_url || store['رابط قروب المتجر'];
        const subscriptionDate = store.subscription_start_date || store['تاريخ بداية الاشتراك'];
        const accountManagerId_direct = store.account_manager_id || null;
        const accountManagerName = store.account_manager || store['مدير الحساب'];
        const mediaBuyerId_direct = store.media_buyer_id || null;
        const mediaBuyerName = store.media_buyer || store['الميديا باير'];
        const notes = store.notes || store['ملاحظات'];

        // التحقق من store_url فقط (الوحيد المطلوب فعلاً)
        if (!storeUrl) {
          results.failed++;
          results.errors.push(`صف بدون store_url: تم تجاهله`);
          continue;
        }

        // جلب اسم المتجر تلقائياً من الموقع إذا كان فارغاً
        if (!storeName) {
          const fetched = await fetchStoreNameFromUrl(storeUrl);
          storeName = fetched || storeUrl;
        }

        // تحويل الأولوية
        let priority = 'medium';
        if (priorityAr === 'مرتفع' || priorityAr === 'high') priority = 'high';
        else if (priorityAr === 'منخفض' || priorityAr === 'low') priority = 'low';

        // تحويل الحالة
        let status = 'new';
        if (statusAr === 'نشط' || statusAr === 'active') status = 'active';
        else if (statusAr === 'متوقف' || statusAr === 'paused') status = 'paused';
        else if (statusAr === 'منتهي' || statusAr === 'expired') status = 'expired';

        // تنظيف رابط المتجر
        const cleanStoreUrl = storeUrl
          .replace(/^https?:\/\//i, '')
          .replace(/^www\./i, '')
          .replace(/\/+$/, '');

        // تنظيف رقم الجوال
        const cleanPhone = String(ownerPhone).replace(/[^0-9+]/g, '');

        // البحث عن مدير الحساب والميديا باير (UUID مباشر أو بحث بالاسم)
        const accountManagerId = accountManagerId_direct || (accountManagerName ? userMap.get(accountManagerName.toLowerCase()) : null);
        const mediaBuyerId = mediaBuyerId_direct || (mediaBuyerName ? userMap.get(mediaBuyerName.toLowerCase()) : null);

        // التحقق من وجود المتجر
        const { data: existingStore } = await supabase
          .from('stores')
          .select('id')
          .eq('store_url', cleanStoreUrl)
          .single();

        if (existingStore) {
          // تحديث المتجر الموجود
          const { error: updateError } = await supabase
            .from('stores')
            .update({
              store_name: storeName,
              owner_name: ownerName || '-',
              owner_phone: cleanPhone,
              owner_email: ownerEmail || null,
              priority,
              status,
              budget: budget || null,
              category: category || null,
              store_group_url: storeGroupUrl || null,
              subscription_start_date: subscriptionDate || null,
              account_manager_id: accountManagerId || null,
              media_buyer_id: mediaBuyerId || null,
              notes: notes || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingStore.id);

          if (updateError) {
            results.failed++;
            results.errors.push(`المتجر "${storeName}": فشل التحديث - ${updateError.message}`);
          } else {
            results.success++;
          }
        } else {
          // إنشاء متجر جديد
          const { error: insertError } = await supabase
            .from('stores')
            .insert({
              store_name: storeName,
              store_url: cleanStoreUrl,
              owner_name: ownerName || '-',
              owner_phone: cleanPhone,
              owner_email: ownerEmail || null,
              priority,
              status,
              budget: budget || null,
              category: category || null,
              store_group_url: storeGroupUrl || null,
              subscription_start_date: subscriptionDate || null,
              account_manager_id: accountManagerId || null,
              media_buyer_id: mediaBuyerId || null,
              notes: notes || null,
              is_active: true
            });

          if (insertError) {
            results.failed++;
            results.errors.push(`المتجر "${storeName}": فشل الإضافة - ${insertError.message}`);
          } else {
            results.success++;
          }
        }
      } catch (err: any) {
        results.failed++;
        results.errors.push(`خطأ غير متوقع: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `تم استيراد ${results.success} متجر بنجاح${results.failed > 0 ? `، فشل ${results.failed}` : ''}`,
      results,
      debug: debugFirstRow
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ في الاستيراد: ' + error.message }, { status: 500 });
  }
}
