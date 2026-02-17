import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { notifyReassign } from '@/lib/notifications';

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
    const cookieStore = cookies();
    const adminUserCookie = cookieStore.get('admin_user');
    if (adminUserCookie?.value) {
      const adminUser = JSON.parse(adminUserCookie.value);
      if (adminUser?.id) return adminUser.id;
    }
  } catch (e) {
  }
  return null;
}

// POST /api/tasks/[id]/reassign - إعادة إسناد المهمة
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const taskId = params.id;
    const { new_assignee_id, reason } = await request.json();

    if (!new_assignee_id) {
      return NextResponse.json({ error: 'معرف المستخدم الجديد مطلوب' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // التحقق من صلاحية المستخدم
    const { data: currentUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', userId)
      .single();

    const isManagerOrAdmin = ['super_admin', 'admin', 'team_leader', 'manager'].includes(currentUser?.role || '');

    // جلب المهمة الحالية
    const { data: task } = await supabase
      .from('store_tasks')
      .select('assigned_to, title')
      .eq('id', taskId)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 });
    }

    // التحقق من الصلاحية: المدير/الأدمن أو المسند له المهمة حالياً
    const canReassign = isManagerOrAdmin || task.assigned_to === userId;

    if (!canReassign) {
      return NextResponse.json({ error: 'غير مصرح بإعادة إسناد هذه المهمة' }, { status: 403 });
    }

    // التحقق من وجود المستخدم الجديد
    const { data: newAssignee } = await supabase
      .from('admin_users')
      .select('id, name, is_active')
      .eq('id', new_assignee_id)
      .single();

    if (!newAssignee) {
      return NextResponse.json({ error: 'المستخدم الجديد غير موجود' }, { status: 404 });
    }

    if (!newAssignee.is_active) {
      return NextResponse.json({ error: 'المستخدم الجديد غير نشط' }, { status: 400 });
    }

    const previousAssigneeId = task.assigned_to;

    // جلب اسم المسند له السابق
    let oldAssigneeName = 'غير محدد';
    if (previousAssigneeId) {
      const { data: oldAssignee } = await supabase
        .from('admin_users')
        .select('name')
        .eq('id', previousAssigneeId)
        .single();
      oldAssigneeName = oldAssignee?.name || 'غير محدد';
    }

    const now = new Date().toISOString();

    // تحديث المهمة
    const { data: updatedTask, error: updateError } = await supabase
      .from('store_tasks')
      .update({
        assigned_to: new_assignee_id,
        updated_at: now,
        last_activity_at: now
      })
      .eq('id', taskId)
      .select(`
        *,
        assigned_user:admin_users!store_tasks_assigned_to_fkey(id, name, username, avatar)
      `)
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'فشل إعادة إسناد المهمة' }, { status: 500 });
    }

    // إضافة تعليق SYSTEM
    const systemComment = `[SYSTEM] تم تحويل المهمة من ${oldAssigneeName} إلى ${newAssignee.name}`;
    try {
      await supabase.from('task_comments').insert({
        task_id: taskId,
        user_id: userId,
        content: systemComment
      });
    } catch (e) {
      // تجاهل خطأ إضافة التعليق
    }

    // تسجيل إعادة الإسناد
    try {
      await supabase.from('task_reassignments').insert({
        task_id: taskId,
        from_user_id: previousAssigneeId,
        to_user_id: new_assignee_id,
        reassigned_by: userId,
        reason: reason || null
      });
    } catch (e) {
      // تجاهل خطأ سجل إعادة الإسناد
    }

    // تسجيل النشاط
    try {
      await supabase.from('task_activity_log').insert({
        task_id: taskId,
        user_id: userId,
        action: 'reassigned',
        details: {
          from_user_id: previousAssigneeId,
          from_user_name: oldAssigneeName,
          to_user_id: new_assignee_id,
          to_user_name: newAssignee.name,
          reason
        }
      });
    } catch (e) {
      // تجاهل خطأ سجل النشاط
    }

    // إرسال إشعار للمسند له الجديد
    try {
      await notifyReassign(
        new_assignee_id,
        taskId,
        task.title || 'مهمة',
        oldAssigneeName
      );
    } catch (e) {
      // تجاهل خطأ الإشعار
    }

    return NextResponse.json({ 
      task: updatedTask,
      message: `تم تحويل المهمة من ${oldAssigneeName} إلى ${newAssignee.name}`
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/tasks/[id]/reassign - جلب سجل إعادة الإسناد
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    const supabase = getSupabaseClient();

    const { data: reassignments, error } = await supabase
      .from('task_reassignments')
      .select(`
        *,
        from_user:admin_users!task_reassignments_from_user_id_fkey(id, name, username),
        to_user:admin_users!task_reassignments_to_user_id_fkey(id, name, username),
        reassigned_by_user:admin_users!task_reassignments_reassigned_by_fkey(id, name, username)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'فشل جلب سجل إعادة الإسناد' }, { status: 500 });
    }

    return NextResponse.json({ reassignments: reassignments || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
