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
  } catch (e) {}

  try {
    const cookieStore = cookies();
    const adminUserCookie = cookieStore.get('admin_user');
    if (adminUserCookie?.value) {
      const adminUser = JSON.parse(adminUserCookie.value);
      if (adminUser?.id) return adminUser.id;
    }
  } catch (e) {}

  return null;
}

// GET /api/admin/tasks/store - جلب مهام المتاجر مع فلاتر
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
    const q = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

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

    if (storeId) query = query.eq('store_id', storeId);
    if (assignedTo) query = query.eq('assigned_to', assignedTo);
    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (type) query = query.eq('type', type);
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

    const { data: tasks, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: 'فشل جلب المهام' }, { status: 500 });
    }

    // إحصائيات
    const { data: allTasks } = await supabase
      .from('store_tasks')
      .select('status, priority, due_date');

    const now = new Date();
    const counts = {
      total: allTasks?.length || 0,
      pending: allTasks?.filter(t => t.status === 'pending').length || 0,
      in_progress: allTasks?.filter(t => t.status === 'in_progress').length || 0,
      done: allTasks?.filter(t => t.status === 'done').length || 0,
      critical: allTasks?.filter(t => t.priority === 'critical').length || 0,
      overdue: allTasks?.filter(t => {
        if (!t.due_date || t.status === 'done' || t.status === 'canceled') return false;
        return new Date(t.due_date) < now;
      }).length || 0
    };

    return NextResponse.json({
      tasks: tasks || [],
      counts,
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/tasks/store - إنشاء مهمة جديدة
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const body = await request.json();

    const { store_id, title, description, assigned_to, priority = 'normal', due_date, type = 'manual' } = body;

    if (!store_id || !title) {
      return NextResponse.json({ error: 'الحقول المطلوبة: store_id, title' }, { status: 400 });
    }

    // التحقق من وجود المتجر
    const { data: store } = await supabase.from('stores').select('id').eq('id', store_id).single();
    if (!store) {
      return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 });
    }

    // إنشاء المهمة
    const { data: newTask, error: createError } = await supabase
      .from('store_tasks')
      .insert({
        store_id,
        title,
        description: description || null,
        assigned_to: assigned_to || null,
        priority,
        due_date: due_date || null,
        type,
        status: 'pending',
        created_by: userId
      })
      .select(`
        *,
        store:stores(id, store_name, store_url),
        assigned_user:admin_users!store_tasks_assigned_to_fkey(id, name, username, avatar)
      `)
      .single();

    if (createError) {
      return NextResponse.json({ error: 'فشل إنشاء المهمة' }, { status: 500 });
    }

    // تسجيل في activity log
    await supabase.from('task_activity_log').insert({
      task_id: newTask.id,
      user_id: userId,
      action: 'created',
      meta: { title, store_id, assigned_to, priority, type }
    });

    return NextResponse.json({ success: true, task: newTask, message: 'تم إنشاء المهمة بنجاح' });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
