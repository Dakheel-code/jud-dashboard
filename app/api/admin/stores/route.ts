import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { StoreWithProgress } from '@/types';
import { requireAuth, requireAdmin } from '@/lib/auth-guard';
import { upsertClient, cleanPhone } from './_lib/upsertClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// الأدوار المسموح لها بإضافة متاجر
const ALLOWED_ROLES_TO_ADD = ['super_admin', 'admin', 'team_leader'];

export async function GET(request: NextRequest) {
  try {
    // التحقق من الجلسة
    const auth = await requireAuth();
    if (!auth.authenticated) return auth.error!;

    // Pagination اختياري — إذا ما فيه limit يرجع الكل (backward compatible)
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const usesPagination = limitParam !== null;

    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }


    const supabase = createClient(supabaseUrl, supabaseKey);

    // جلب المتاجر + عدد المهام المكتملة لكل متجر بـ 3 queries متوازية (بدون O(n²))
    let storesQuery = supabase
      .from('stores')
      .select(`
        id, store_name, store_url, owner_name, owner_phone, owner_email,
        account_manager_id, media_buyer_id, notes, priority, budget, status,
        is_active, created_at, updated_at,
        account_manager:admin_users!stores_account_manager_id_fkey(id, name, username),
        media_buyer:admin_users!stores_media_buyer_id_fkey(id, name, username)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Pagination — دائماً يوجد limit افتراضي
    const limit = Math.min(parseInt(limitParam || '50'), 200);
    const offset = parseInt(offsetParam || '0');
    storesQuery = storesQuery.range(offset, offset + limit - 1);

    const [storesResult, tasksCountResult, progressResult] = await Promise.all([
      storesQuery,
      supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true }),
      // Aggregation: عدد المهام المكتملة لكل متجر — بدلاً من جلب كل الصفوف
      supabase.rpc('get_store_completed_counts')
    ]);

    if (storesResult.error) {
      return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
    }

    const stores = storesResult.data;
    const totalTasks = tasksCountResult.count || 0;

    // بناء map للوصول السريع O(1) بدلاً من filter O(n)
    const completedMap: Record<string, number> = {};
    if (progressResult.data) {
      (progressResult.data as any[]).forEach((row: any) => {
        completedMap[row.store_id] = Number(row.completed_count);
      });
    }

    const storesWithProgress: StoreWithProgress[] = stores.map((store: any) => {
      const completedTasks = completedMap[store.id] || 0;
      const completionPercentage =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: store.id,
        store_name: store.store_name,
        store_url: store.store_url,
        owner_name: store.owner_name,
        owner_phone: store.owner_phone,
        owner_email: store.owner_email,
        account_manager_id: store.account_manager_id,
        account_manager_name: store.account_manager?.name || null,
        media_buyer_id: store.media_buyer_id,
        media_buyer_name: store.media_buyer?.name || null,
        notes: store.notes,
        priority: store.priority || 'medium',
        budget: store.budget || null,
        status: store.status || 'new',
        is_active: store.is_active,
        created_at: store.created_at,
        updated_at: store.updated_at,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        completion_percentage: completionPercentage,
      };
    });

    const response: any = { stores: storesWithProgress };
    response.pagination = {
      total: storesResult.count || 0,
      limit,
      offset,
      totalPages: Math.ceil((storesResult.count || 0) / limit)
    };
    return NextResponse.json(response, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// إضافة متجر جديد
export async function POST(request: Request) {
  try {
    // التحقق من الجلسة - فقط المسؤولين يمكنهم إضافة متاجر
    const auth = await requireAdmin();
    if (!auth.authenticated) return auth.error!;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // قراءة بيانات المتجر
    const body = await request.json();
    const { 
      store_name, 
      store_url, 
      owner_name, 
      owner_phone, 
      owner_email, 
      account_manager_id,
      media_buyer_id,
      priority,
      status,
      budget,
      notes,
      client_id,
      subscription_start_date,
      store_group_url,
      category
    } = body;

    // التحقق من الحقول المطلوبة
    if (!store_name || !store_url || !owner_phone || !owner_name) {
      return NextResponse.json({ 
        error: 'الحقول المطلوبة: اسم المتجر، رابط المتجر، صاحب المتجر، رقم الجوال' 
      }, { status: 400 });
    }

    // تنظيف رقم الجوال
    const phone = cleanPhone(owner_phone);

    // تنظيف رابط المتجر - إزالة https:// و http:// و www.
    const cleanStoreUrl = store_url
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/+$/, '');

    // ── إنشاء/ربط العميل أولاً (قبل المتجر) ───────────────
    const clientResult = await upsertClient(supabase as any, {
      owner_name,
      owner_phone: phone,
      owner_email: owner_email || null,
    });
    const finalClientId = client_id || clientResult?.clientId || null;

    // ── إنشاء المتجر ─────────────────────────────────────────
    const { data: newStore, error: createError } = await supabase
      .from('stores')
      .insert({
        store_name,
        store_url:               cleanStoreUrl,
        owner_name,
        owner_phone:             phone,
        owner_email:             owner_email             || null,
        account_manager_id:      account_manager_id      || null,
        media_buyer_id:          media_buyer_id          || null,
        priority:                priority                || 'medium',
        status:                  status                  || 'new',
        budget:                  budget                  || null,
        notes:                   notes                   || null,
        client_id:               finalClientId,
        subscription_start_date: subscription_start_date || null,
        store_group_url:         store_group_url         || null,
        category:                category                || null,
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      if (createError.code === '23505') {
        return NextResponse.json({ error: 'رابط المتجر موجود مسبقاً' }, { status: 400 });
      }
      return NextResponse.json({ error: 'فشل إنشاء المتجر' }, { status: 500 });
    }

    // ── ربط المتجر الجديد بالعميل ────────────────────────────
    if (clientResult?.clientId && newStore?.id) {
      await supabase
        .from('stores')
        .update({ client_id: clientResult.clientId })
        .eq('id', newStore.id);
    }

    return NextResponse.json({ 
      success:       true, 
      store:         newStore,
      message:       'تم إنشاء المتجر بنجاح',
      clientCreated: clientResult?.action === 'created',
      clientId:      finalClientId,
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// تحديث بيانات متجر
export async function PUT(request: Request) {
  try {
    // التحقق من الجلسة
    const auth = await requireAuth();
    if (!auth.authenticated) return auth.error!;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await request.json();
    const { 
      id,
      store_name, 
      store_url, 
      owner_name, 
      owner_phone, 
      owner_email, 
      account_manager_id,
      priority,
      budget,
      notes,
      client_id 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف المتجر مطلوب' }, { status: 400 });
    }

    // تنظيف رابط المتجر - إزالة https:// و http:// و www.
    const cleanStoreUrl = store_url
      ? store_url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '')
      : undefined;

    // تحديث المتجر
    const { data: updatedStore, error: updateError } = await supabase
      .from('stores')
      .update({
        store_name,
        store_url: cleanStoreUrl,
        owner_name: owner_name || '-',
        owner_phone,
        owner_email: owner_email || null,
        account_manager_id: account_manager_id || null,
        priority: priority || 'medium',
        budget: budget || null,
        notes: notes || null,
        client_id: client_id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === '23505') {
        return NextResponse.json({ error: 'رابط المتجر موجود مسبقاً' }, { status: 400 });
      }
      return NextResponse.json({ error: 'فشل تحديث المتجر' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      store: updatedStore,
      message: 'تم تحديث المتجر بنجاح'
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
