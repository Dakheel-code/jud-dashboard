import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { StoreWithProgress } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// الأدوار المسموح لها بإضافة متاجر
const ALLOWED_ROLES_TO_ADD = ['super_admin', 'admin', 'team_leader'];

export async function GET() {
  try {
    console.log('=== FETCH STORES ===');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials missing');
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    console.log('🔗 Connecting to Supabase:', supabaseUrl);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // جلب المتاجر مع بيانات مدير الحساب
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select(`
        *,
        account_manager:admin_users!stores_account_manager_id_fkey(id, name, username),
        media_buyer:admin_users!stores_media_buyer_id_fkey(id, name, username)
      `)
      .order('created_at', { ascending: false });

    console.log('📦 Stores fetched:', stores?.length, 'Error:', storesError);

    if (storesError) {
      console.error('❌ Stores error:', storesError);
      return NextResponse.json(
        { error: 'Failed to fetch stores' },
        { status: 500 }
      );
    }

    const { data: allTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id');

    if (tasksError) {
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    const { data: allProgress, error: progressError } = await supabase
      .from('tasks_progress')
      .select('store_id, is_done');

    if (progressError) {
      return NextResponse.json(
        { error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }

    const totalTasks = allTasks.length;

    const storesWithProgress: StoreWithProgress[] = stores.map((store: any) => {
      const storeProgress = allProgress.filter(
        (p: any) => p.store_id === store.id && p.is_done
      );
      const completedTasks = storeProgress.length;
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

    return NextResponse.json({ stores: storesWithProgress });
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
      priority,
      budget,
      notes,
      client_id 
    } = body;

    // التحقق من الحقول المطلوبة
    if (!store_name || !store_url || !owner_phone) {
      return NextResponse.json({ 
        error: 'الحقول المطلوبة: اسم المتجر، رابط المتجر، رقم الجوال' 
      }, { status: 400 });
    }

    // تنظيف رابط المتجر - إزالة https:// و http:// و www.
    const cleanStoreUrl = store_url
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/+$/, '');

    // إنشاء المتجر
    const { data: newStore, error: createError } = await supabase
      .from('stores')
      .insert({
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
        is_active: true
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Create store error:', createError);
      if (createError.code === '23505') {
        return NextResponse.json({ error: 'رابط المتجر موجود مسبقاً' }, { status: 400 });
      }
      return NextResponse.json({ error: 'فشل إنشاء المتجر' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      store: newStore,
      message: 'تم إنشاء المتجر بنجاح'
    });

  } catch (error) {
    console.error('❌ POST store error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// تحديث بيانات متجر
export async function PUT(request: Request) {
  try {
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
      console.error('❌ Update store error:', updateError);
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
    console.error('❌ PUT store error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
