import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { notifyHelpResponse } from '@/lib/notifications';

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
    console.log('Cookie parsing failed');
  }
  return null;
}

async function getUserRole(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('admin_users')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role || null;
}

// PUT /api/tasks/[id]/help-requests/[requestId] - الرد على طلب المساعدة
export async function PUT(
  request: Request,
  { params }: { params: { id: string; requestId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { status } = await request.json();

    if (!status || !['accepted', 'declined', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'حالة غير صالحة' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // جلب طلب المساعدة
    const { data: helpRequest } = await supabase
      .from('task_help_requests')
      .select(`
        id,
        task_id,
        helper_id,
        requester_id,
        status,
        helper:admin_users!task_help_requests_helper_id_fkey(id, name)
      `)
      .eq('id', params.requestId)
      .single();

    if (!helpRequest) {
      return NextResponse.json({ error: 'طلب المساعدة غير موجود' }, { status: 404 });
    }

    // التحقق من الصلاحية
    const userRole = await getUserRole(supabase, userId);
    const isAdmin = ['super_admin', 'admin'].includes(userRole || '');
    const isManager = ['super_admin', 'admin', 'team_leader', 'manager'].includes(userRole || '');
    const isHelper = helpRequest.helper_id === userId;

    if (!isHelper && !isAdmin && !isManager) {
      return NextResponse.json({ error: 'غير مصرح بالرد على هذا الطلب' }, { status: 403 });
    }

    // التحقق من أن الطلب معلق (للقبول/الرفض)
    if (['accepted', 'declined'].includes(status) && helpRequest.status !== 'pending') {
      return NextResponse.json({ error: 'لا يمكن تغيير حالة طلب غير معلق' }, { status: 400 });
    }

    // تحديث الطلب
    const { data: updatedRequest, error } = await supabase
      .from('task_help_requests')
      .update({
        status,
        responded_at: new Date().toISOString()
      })
      .eq('id', params.requestId)
      .select(`
        id,
        task_id,
        message,
        status,
        created_at,
        responded_at,
        requester:admin_users!task_help_requests_requester_id_fkey(id, name, username, avatar),
        helper:admin_users!task_help_requests_helper_id_fkey(id, name, username, avatar)
      `)
      .single();

    if (error) {
      console.error('Error updating help request:', error);
      return NextResponse.json({ error: 'فشل تحديث طلب المساعدة' }, { status: 500 });
    }

    // إضافة تعليق SYSTEM
    const helperName = (helpRequest.helper as any)?.name || 'المساعد';
    const statusText = status === 'accepted' ? 'قبول' : status === 'declined' ? 'رفض' : 'إكمال';
    const systemComment = `[SYSTEM] ${helperName} قام بـ ${statusText} طلب المساعدة`;
    
    try {
      await supabase.from('task_comments').insert({
        task_id: helpRequest.task_id,
        user_id: userId,
        content: systemComment
      });
    } catch (e) {
      // تجاهل خطأ التعليق
    }

    // تحديث last_activity_at
    try {
      await supabase
        .from('store_tasks')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', helpRequest.task_id);
    } catch (e) {
      // تجاهل الخطأ
    }

    // إرسال إشعار للطالب
    if (status === 'accepted' || status === 'declined') {
      try {
        const { data: task } = await supabase
          .from('store_tasks')
          .select('title')
          .eq('id', helpRequest.task_id)
          .single();

        await notifyHelpResponse(
          helpRequest.requester_id,
          helpRequest.task_id,
          task?.title || 'مهمة',
          helperName,
          status === 'accepted'
        );
      } catch (e) {
        // تجاهل خطأ الإشعار
      }
    }

    return NextResponse.json({ helpRequest: updatedRequest });
  } catch (error) {
    console.error('PUT help request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]/help-requests/[requestId] - حذف طلب المساعدة
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; requestId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    // جلب طلب المساعدة
    const { data: helpRequest } = await supabase
      .from('task_help_requests')
      .select('id, requester_id, status')
      .eq('id', params.requestId)
      .single();

    if (!helpRequest) {
      return NextResponse.json({ error: 'طلب المساعدة غير موجود' }, { status: 404 });
    }

    // التحقق من الصلاحية
    const userRole = await getUserRole(supabase, userId);
    const isAdmin = ['super_admin', 'admin'].includes(userRole || '');
    const isManager = ['super_admin', 'admin', 'team_leader', 'manager'].includes(userRole || '');
    const isRequester = helpRequest.requester_id === userId;
    const isPending = helpRequest.status === 'pending';

    if (!isAdmin && !isManager && !(isRequester && isPending)) {
      return NextResponse.json({ error: 'غير مصرح بحذف هذا الطلب' }, { status: 403 });
    }

    // حذف الطلب
    const { error } = await supabase
      .from('task_help_requests')
      .delete()
      .eq('id', params.requestId);

    if (error) {
      console.error('Error deleting help request:', error);
      return NextResponse.json({ error: 'فشل حذف طلب المساعدة' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE help request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
