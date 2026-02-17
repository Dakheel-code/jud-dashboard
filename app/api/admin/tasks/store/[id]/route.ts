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

// GET /api/admin/tasks/store/:id - جلب مهمة واحدة
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const taskId = params.id;

    const { data: task, error } = await supabase
      .from('store_tasks')
      .select(`
        *,
        store:stores(id, store_name, store_url),
        assigned_user:admin_users!store_tasks_assigned_to_fkey(id, name, username, avatar),
        created_user:admin_users!store_tasks_created_by_fkey(id, name, username),
        participants:task_participants(
          id, role, notes, added_at,
          user:admin_users(id, name, username, avatar)
        ),
        activity_log:task_activity_log(
          id, action, meta, created_at,
          user:admin_users(id, name, username)
        )
      `)
      .eq('id', taskId)
      .single();

    if (error || !task) {
      return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({ task });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/admin/tasks/store/:id - تحديث مهمة
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
      .select('*')
      .eq('id', taskId)
      .single();

    if (fetchError || !currentTask) {
      return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 });
    }

    const { title, description, status, priority, assigned_to, due_date } = body;

    // بناء كائن التحديث وتتبع التغييرات
    const updateData: any = { updated_at: new Date().toISOString() };
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
      if (status === 'done') updateData.completed_at = new Date().toISOString();
    }
    if (priority !== undefined && priority !== currentTask.priority) {
      updateData.priority = priority;
      changes.priority = { old: currentTask.priority, new: priority };
    }
    if (assigned_to !== undefined && assigned_to !== currentTask.assigned_to) {
      updateData.assigned_to = assigned_to || null;
      changes.assigned_to = { old: currentTask.assigned_to, new: assigned_to };
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
        assigned_user:admin_users!store_tasks_assigned_to_fkey(id, name, username, avatar)
      `)
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'فشل تحديث المهمة' }, { status: 500 });
    }

    // تسجيل في activity log
    if (Object.keys(changes).length > 0) {
      let action = 'updated';
      if (changes.status) action = 'status_changed';
      else if (changes.assigned_to) action = changes.assigned_to.old ? 'reassigned' : 'assigned';
      else if (changes.priority) action = 'priority_changed';
      else if (changes.due_date) action = 'due_date_changed';

      await supabase.from('task_activity_log').insert({
        task_id: taskId,
        user_id: userId,
        action,
        meta: changes
      });
    }

    return NextResponse.json({ success: true, task: updatedTask, changes, message: 'تم تحديث المهمة بنجاح' });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/tasks/store/:id - حذف مهمة
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

    const { error } = await supabase
      .from('store_tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      return NextResponse.json({ error: 'فشل حذف المهمة' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'تم حذف المهمة بنجاح' });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
