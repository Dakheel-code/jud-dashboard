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
      const decodedValue = decodeURIComponent(adminUserCookie.value);
      const adminUser = JSON.parse(decodedValue);
      if (adminUser?.id) return adminUser.id;
    }
  } catch (e) {
  }

  return null;
}

// GET /api/admin/store-tasks/:id - جلب مهمة واحدة
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const taskId = params.id;

    // جلب المهمة الأساسية
    const { data: task, error } = await supabase
      .from('store_tasks')
      .select('id, title, description, store_id, assigned_to, priority, status, type, due_date, created_by, created_at, updated_at, is_individual, assign_to_all, assigned_roles')
      .eq('id', taskId)
      .single();

    if (error) {
      return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 });
    }

    if (!task) {
      return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 });
    }

    // جلب المتجر إذا موجود
    let store = null;
    if (task.store_id) {
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, store_name, store_url')
        .eq('id', task.store_id)
        .single();
      store = storeData;
    }

    // جلب المستخدم المسند إليه
    let assignedUser = null;
    if (task.assigned_to) {
      const { data: userData } = await supabase
        .from('admin_users')
        .select('id, name, username, avatar')
        .eq('id', task.assigned_to)
        .single();
      assignedUser = userData;
    }

    // جلب المشاركين بشكل منفصل (تجاهل الخطأ إذا الجدول غير موجود)
    let participants: any[] = [];
    try {
      const { data: parts } = await supabase
        .from('task_participants')
        .select(`
          id,
          role,
          user:admin_users(id, name, username, avatar)
        `)
        .eq('task_id', taskId);
      participants = parts || [];
    } catch (e) {}

    // جلب سجل النشاط بشكل منفصل
    let activityLog: any[] = [];
    try {
      const { data: logs } = await supabase
        .from('task_activity_log')
        .select(`
          id,
          action,
          meta,
          created_at,
          user:admin_users(id, name, username)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(20);
      activityLog = logs || [];
    } catch (e) {}

    return NextResponse.json({ 
      task: {
        ...task,
        store,
        assigned_user: assignedUser,
        participants,
        activity_log: activityLog
      }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 2.4 PUT /api/admin/store-tasks/:id - تحديث مهمة / تغيير حالة / تحويل
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const taskId = params.id;
    const body = await request.json();

    // جلب المهمة الحالية
    const { data: currentTask, error: fetchError } = await supabase
      .from('store_tasks')
      .select('id, title, description, status, priority, assigned_to, store_id, created_by, due_date')
      .eq('id', taskId)
      .single();

    if (fetchError || !currentTask) {
      return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 });
    }

    const {
      title,
      description,
      status,
      priority,
      assigned_to,
      due_date
    } = body;

    // بناء كائن التحديث
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // تتبع التغييرات للـ activity log
    const changes: any = {};

    if (title !== undefined && title !== currentTask.title) {
      updateData.title = title;
      changes.title = { old: currentTask.title, new: title };
    }

    if (description !== undefined && description !== currentTask.description) {
      updateData.description = description;
      changes.description = { old: currentTask.description, new: description };
    }

    if (status !== undefined && status !== currentTask.status) {
      updateData.status = status;
      changes.status = { old: currentTask.status, new: status };
      
      // إذا تم إكمال المهمة
      if (status === 'done') {
        updateData.completed_at = new Date().toISOString();
      }
    }

    if (priority !== undefined && priority !== currentTask.priority) {
      updateData.priority = priority;
      changes.priority = { old: currentTask.priority, new: priority };
    }

    if (assigned_to !== undefined && assigned_to !== currentTask.assigned_to) {
      // التأكد من أن assigned_to هو string وليس array
      let assignedToValue = assigned_to;
      if (Array.isArray(assigned_to)) {
        assignedToValue = assigned_to[0] || null;
      }
      updateData.assigned_to = assignedToValue || null;
      
      // جلب اسم المستخدم الجديد
      let assignedUserName = null;
      if (assignedToValue) {
        const { data: assignedUser } = await supabase
          .from('admin_users')
          .select('name')
          .eq('id', assignedToValue)
          .single();
        assignedUserName = assignedUser?.name;
      }
      
      changes.assigned_to = { 
        old: currentTask.assigned_to, 
        new: assignedToValue,
        assigned_user_name: assignedUserName
      };
    }

    if (due_date !== undefined && due_date !== currentTask.due_date) {
      updateData.due_date = due_date || null;
      changes.due_date = { old: currentTask.due_date, new: due_date };
    }

    // تحديث المهمة
    const { data: updatedTask, error: updateError } = await supabase
      .from('store_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select(`
        *,
        store:stores(id, store_name, store_url),
        assigned_user:admin_users!store_tasks_assigned_to_fkey(id, name, username, avatar),
        created_user:admin_users!store_tasks_created_by_fkey(id, name, username)
      `)
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'فشل تحديث المهمة' }, { status: 500 });
    }

    // تسجيل في activity log
    if (Object.keys(changes).length > 0) {
      // تحديد نوع الإجراء
      let action = 'updated';
      if (changes.status) {
        action = 'status_changed';
      } else if (changes.assigned_to) {
        action = changes.assigned_to.old ? 'reassigned' : 'assigned';
      } else if (changes.priority) {
        action = 'priority_changed';
      } else if (changes.due_date) {
        action = 'due_date_changed';
      }

      const { error: activityError } = await supabase.from('task_activity_log').insert({
        task_id: taskId,
        user_id: userId,
        action,
        details: changes
      });
      if (activityError) {
      } else {
      }
    }

    return NextResponse.json({
      success: true,
      task: updatedTask,
      changes,
      message: 'تم تحديث المهمة بنجاح'
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/store-tasks/:id - حذف مهمة
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const taskId = params.id;

    // حذف المهمة (سيحذف المشاركين والـ logs تلقائياً بسبب CASCADE)
    const { error } = await supabase
      .from('store_tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      return NextResponse.json({ error: 'فشل حذف المهمة' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف المهمة بنجاح'
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
