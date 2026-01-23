import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database configuration error');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// الحصول على معرف المستخدم الحالي
async function getCurrentUserId(): Promise<string | null> {
  // محاولة الحصول على الجلسة من NextAuth
  try {
    const session = await getServerSession();
    if (session?.user?.email) {
      const supabase = getSupabaseClient();
      const { data: user } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', session.user.email)
        .single();
      
      if (user) return user.id;
    }
  } catch (e) {
    console.log('NextAuth session not available');
  }

  // محاولة الحصول من الكوكيز (legacy token)
  try {
    const cookieStore = cookies();
    const adminUserCookie = cookieStore.get('admin_user');
    if (adminUserCookie?.value) {
      const adminUser = JSON.parse(adminUserCookie.value);
      if (adminUser?.id) return adminUser.id;
    }
  } catch (e) {
    console.log('Cookie parsing failed');
  }

  return null;
}

// GET /api/tasks/my - جلب مهام الموظف
export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    // فلاتر اختيارية
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const storeId = searchParams.get('store_id');

    // 1. جلب المتاجر التي المستخدم مدير حساب لها
    const { data: userStores, error: storesError } = await supabase
      .from('stores')
      .select('id, store_name, store_url, account_manager_id')
      .eq('account_manager_id', userId);
    
    console.log('User stores for userId:', userId, 'Found:', userStores?.length, 'Error:', storesError);

    const userStoreIds = userStores?.map(s => s.id) || [];
    const myStoresDetails = userStores || [];

    // 2. جلب المهام التي المستخدم مشارك فيها
    const { data: participations } = await supabase
      .from('task_participants')
      .select('task_id')
      .eq('user_id', userId);

    const participatedTaskIds = participations?.map(p => p.task_id) || [];

    // 3. بناء استعلام المهام
    let query = supabase
      .from('store_tasks')
      .select(`
        *,
        store:stores(id, store_name, store_url),
        assigned_user:admin_users!store_tasks_assigned_to_fkey(id, name, username, avatar),
        created_user:admin_users!store_tasks_created_by_fkey(id, name, username)
      `)
      .order('created_at', { ascending: false });

    // تطبيق الفلاتر
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data: allTasks, error: tasksError } = await query;

    console.log('All tasks fetched:', allTasks?.length, 'for userId:', userId);
    console.log('Sample tasks assigned_to:', allTasks?.slice(0, 3).map(t => ({ id: t.id, assigned_to: t.assigned_to, title: t.title })));

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json({ error: 'فشل جلب المهام' }, { status: 500 });
    }

    // 4. فلترة المهام حسب الشروط
    const myTasks = (allTasks || []).filter(task => {
      // الشرط 1: المهمة مسندة للمستخدم مباشرة
      if (task.assigned_to === userId) return true;
      
      // الشرط 2: المستخدم مشارك في المهمة
      if (participatedTaskIds.includes(task.id)) return true;
      
      // الشرط 3: المهمة تابعة لمتجر المستخدم مسؤول عنه
      if (task.store_id && userStoreIds.includes(task.store_id)) return true;
      
      // الشرط 4: المهمة مكلف بها الجميع (assign_to_all)
      if (task.assign_to_all === true) return true;
      
      // الشرط 5: المهمة مكلف بها حسب الدور (assigned_roles)
      // سنحتاج جلب أدوار المستخدم لهذا الشرط لاحقاً
      
      return false;
    });
    
    console.log('Filtered tasks for user:', userId, 'Total:', myTasks.length);

    // 5. حساب الإحصائيات
    const now = new Date();
    const counts = {
      total: myTasks.length,
      pending: myTasks.filter(t => t.status === 'pending').length,
      in_progress: myTasks.filter(t => t.status === 'in_progress').length,
      waiting: myTasks.filter(t => t.status === 'waiting').length,
      done: myTasks.filter(t => t.status === 'done').length,
      blocked: myTasks.filter(t => t.status === 'blocked').length,
      critical: myTasks.filter(t => t.priority === 'critical').length,
      high: myTasks.filter(t => t.priority === 'high').length,
      overdue: myTasks.filter(t => {
        if (!t.due_date || t.status === 'done' || t.status === 'canceled') return false;
        return new Date(t.due_date) < now;
      }).length
    };

    // 6. إضافة معلومات إضافية لكل مهمة
    const tasksWithMeta = myTasks.map(task => ({
      ...task,
      is_overdue: task.due_date && task.status !== 'done' && task.status !== 'canceled' 
        ? new Date(task.due_date) < now 
        : false,
      is_assigned_to_me: task.assigned_to === userId,
      is_my_store: userStoreIds.includes(task.store_id),
      is_participant: participatedTaskIds.includes(task.id)
    }));

    // 7. جلب مهام المتاجر الأساسية (checklist) لكل متجر مسند للمستخدم
    const storesWithTasks: Array<{
      id: string;
      store_name: string;
      store_url: string;
      total_tasks: number;
      completed_tasks: number;
      remaining_tasks: number;
    }> = [];

    // جلب عدد المهام الأساسية الكلي
    const { data: allBaseTasks, error: baseTasksError } = await supabase
      .from('tasks')
      .select('id');
    const totalBaseTasks = allBaseTasks?.length || 0;
    
    console.log('Base tasks count:', totalBaseTasks, 'Error:', baseTasksError);
    console.log('My stores details:', myStoresDetails?.length);
    
    for (const store of myStoresDetails) {
      // جلب تقدم المهام للمتجر من جدول tasks_progress
      const { data: storeProgress } = await supabase
        .from('tasks_progress')
        .select('id, is_done')
        .eq('store_id', store.id);
      
      const completedTasks = storeProgress?.filter(t => t.is_done).length || 0;
      
      storesWithTasks.push({
        id: store.id,
        store_name: store.store_name,
        store_url: store.store_url,
        total_tasks: totalBaseTasks,
        completed_tasks: completedTasks,
        remaining_tasks: totalBaseTasks - completedTasks
      });
    }

    console.log('Stores with tasks:', storesWithTasks.length);

    return NextResponse.json({
      tasks: tasksWithMeta,
      counts,
      user_id: userId,
      my_stores: storesWithTasks
    });

  } catch (error) {
    console.error('GET /api/tasks/my error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
