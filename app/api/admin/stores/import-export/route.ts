import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
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

    for (const store of stores) {
      try {
        // تحويل الأسماء العربية للحقول الإنجليزية
        const storeName = store['اسم المتجر'] || store.store_name;
        const storeUrl = store['رابط المتجر'] || store.store_url;
        const ownerName = store['اسم صاحب المتجر'] || store.owner_name;
        const ownerPhone = store['رقم الجوال'] || store.owner_phone;
        const ownerEmail = store['البريد الإلكتروني'] || store.owner_email;
        const priorityAr = store['الأولوية'] || store.priority;
        const statusAr = store['الحالة'] || store.status;
        const budget = store['الميزانية'] || store.budget;
        const category = store['التصنيف'] || store.category;
        const storeGroupUrl = store['رابط قروب المتجر'] || store.store_group_url;
        const subscriptionDate = store['تاريخ بداية الاشتراك'] || store.subscription_start_date;
        const accountManagerName = store['مدير الحساب'] || store.account_manager;
        const mediaBuyerName = store['الميديا باير'] || store.media_buyer;
        const notes = store['ملاحظات'] || store.notes;

        // التحقق من الحقول المطلوبة
        if (!storeName || !storeUrl || !ownerPhone) {
          results.failed++;
          results.errors.push(`المتجر "${storeName || 'غير معروف'}": الحقول المطلوبة ناقصة`);
          continue;
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

        // البحث عن مدير الحساب والميديا باير
        const accountManagerId = accountManagerName ? userMap.get(accountManagerName.toLowerCase()) : null;
        const mediaBuyerId = mediaBuyerName ? userMap.get(mediaBuyerName.toLowerCase()) : null;

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
      results
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ في الاستيراد: ' + error.message }, { status: 500 });
  }
}
