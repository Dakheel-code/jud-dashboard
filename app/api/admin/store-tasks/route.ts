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

// 2.2 GET /api/admin/store-tasks - جلب كل المهام مع فلاتر
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);

    // الفلاتر
    const storeId = searchParams.get('store_id');
    const assignedTo = searchParams.get('assigned_to');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');
    const q = searchParams.get('q'); // بحث
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // بناء الاستعلام
    let query = supabase
      .from('store_tasks')
      .select(`
        *,
        store:stores(id, store_name, store_url),
        assigned_user:admin_users!store_tasks_assigned_to_fkey(id, name, username, avatar),
        created_user:admin_users!store_tasks_created_by_fkey(id, name, username)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // تطبيق الفلاتر
    if (storeId) {
      query = query.eq('store_id', storeId);
    }
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (q) {
      // تنظيف مدخلات البحث لمنع SQL Injection
      const sanitizedQ = q.replace(/[%_\\'"]/g, '');
      if (sanitizedQ.trim()) {
        query = query.or(`title.ilike.%${sanitizedQ}%,description.ilike.%${sanitizedQ}%`);
      }
    }

    const { data: tasks, error, count } = await query;

    if (error) {
      console.error('Error fetching store tasks:', error);
      return NextResponse.json({ error: 'فشل جلب المهام' }, { status: 500 });
    }

    // حساب الإحصائيات العامة
    const { data: allTasks } = await supabase
      .from('store_tasks')
      .select('status, priority, due_date');

    const now = new Date();
    const counts = {
      total: allTasks?.length || 0,
      pending: allTasks?.filter(t => t.status === 'pending').length || 0,
      in_progress: allTasks?.filter(t => t.status === 'in_progress').length || 0,
      waiting: allTasks?.filter(t => t.status === 'waiting').length || 0,
      done: allTasks?.filter(t => t.status === 'done').length || 0,
      blocked: allTasks?.filter(t => t.status === 'blocked').length || 0,
      canceled: allTasks?.filter(t => t.status === 'canceled').length || 0,
      critical: allTasks?.filter(t => t.priority === 'critical').length || 0,
      overdue: allTasks?.filter(t => {
        if (!t.due_date || t.status === 'done' || t.status === 'canceled') return false;
        return new Date(t.due_date) < now;
      }).length || 0
    };

    return NextResponse.json({
      tasks: tasks || [],
      counts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('GET /api/admin/store-tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 2.3 POST /api/admin/store-tasks - إنشاء مهمة جديدة
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const body = await request.json();

    const {
      store_id,
      title,
      description,
      assigned_to = [],
      assigned_roles = [],
      assign_to_all = false,
      is_individual = false,
      priority = 'normal',
      due_date,
      type = 'manual'
    } = body;

    // التحقق من الحقول المطلوبة
    if (!title) {
      return NextResponse.json({ 
        error: 'عنوان المهمة مطلوب' 
      }, { status: 400 });
    }

    // التحقق من المتجر إذا لم تكن مهمة فردية
    if (!is_individual && !store_id) {
      return NextResponse.json({ 
        error: 'يرجى اختيار متجر أو تحديد المهمة كمهمة فردية' 
      }, { status: 400 });
    }

    // التحقق من وجود المتجر إذا تم تحديده
    if (store_id) {
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('id')
        .eq('id', store_id)
        .single();

      if (storeError || !store) {
        return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 });
      }
    }

    // تحديد المكلفين
    let assignedUsers: string[] = [];
    
    if (assign_to_all) {
      // تكليف جميع المستخدمين
      const { data: allUsers } = await supabase
        .from('admin_users')
        .select('id')
        .eq('is_active', true);
      assignedUsers = allUsers?.map(u => u.id) || [];
    } else if (assigned_roles && assigned_roles.length > 0) {
      // تكليف حسب الأدوار
      const { data: roleUsers } = await supabase
        .from('admin_users')
        .select('id, roles')
        .eq('is_active', true);
      
      assignedUsers = roleUsers?.filter(u => 
        u.roles?.some((r: string) => assigned_roles.includes(r))
      ).map(u => u.id) || [];
    } else if (assigned_to && assigned_to.length > 0) {
      // تكليف مستخدمين محددين
      assignedUsers = assigned_to;
    }

    // إنشاء المهمة الأساسية (للمكلف الأول أو null)
    const primaryAssignee = assignedUsers.length > 0 ? assignedUsers[0] : null;
    
    const { data: newTask, error: createError } = await supabase
      .from('store_tasks')
      .insert({
        store_id: is_individual ? null : store_id,
        title,
        description: description || null,
        assigned_to: primaryAssignee,
        priority,
        due_date: due_date ? (due_date.includes('-') ? due_date : new Date(Date.now() + parseInt(due_date) * 24 * 60 * 60 * 1000).toISOString()) : null,
        type,
        status: 'pending',
        created_by: userId,
        is_individual: is_individual,
        assign_to_all: assign_to_all,
        assigned_roles: assigned_roles.length > 0 ? assigned_roles : null
      })
      .select(`
        *,
        store:stores(id, store_name, store_url),
        assigned_user:admin_users!store_tasks_assigned_to_fkey(id, name, username, avatar),
        created_user:admin_users!store_tasks_created_by_fkey(id, name, username)
      `)
      .single();

    if (createError) {
      console.error('Error creating task:', createError);
      return NextResponse.json({ error: 'فشل إنشاء المهمة' }, { status: 500 });
    }

    // إضافة المشاركين الإضافيين إذا كان هناك أكثر من مكلف
    if (assignedUsers.length > 1) {
      const participantsToInsert = assignedUsers.slice(1).map(uid => ({
        task_id: newTask.id,
        user_id: uid,
        role: 'assignee'
      }));
      
      await supabase.from('task_participants').insert(participantsToInsert);
    }

    // تسجيل في activity log
    await supabase.from('task_activity_log').insert({
      task_id: newTask.id,
      user_id: userId,
      action: 'created',
      meta: {
        title,
        store_id: is_individual ? null : store_id,
        is_individual,
        assigned_to: assignedUsers,
        assigned_roles,
        assign_to_all,
        priority,
        type
      }
    });

    return NextResponse.json({
      success: true,
      task: newTask,
      message: 'تم إنشاء المهمة بنجاح'
    });

  } catch (error) {
    console.error('POST /api/admin/store-tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
