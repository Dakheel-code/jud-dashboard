import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

// GET /api/tasks/[id]/help-request - جلب طلبات المساعدة للمهمة
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    const supabase = getSupabaseClient();

    const { data: helpRequests, error } = await supabase
      .from('task_help_requests')
      .select(`
        *,
        requester:admin_users!task_help_requests_requester_id_fkey(id, name, username, avatar),
        assigned_user:admin_users!task_help_requests_assigned_to_fkey(id, name, username, avatar),
        resolver:admin_users!task_help_requests_resolved_by_fkey(id, name, username)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching help requests:', error);
      return NextResponse.json({ error: 'فشل جلب طلبات المساعدة' }, { status: 500 });
    }

    return NextResponse.json({ help_requests: helpRequests || [] });
  } catch (error) {
    console.error('GET help requests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/help-request - إنشاء طلب مساعدة جديد
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
    const { message, assigned_to, priority } = await request.json();

    if (!message || message.trim() === '') {
      return NextResponse.json({ error: 'رسالة طلب المساعدة مطلوبة' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // إنشاء طلب المساعدة
    const { data: helpRequest, error } = await supabase
      .from('task_help_requests')
      .insert({
        task_id: taskId,
        requester_id: userId,
        assigned_to: assigned_to || null,
        message: message.trim(),
        priority: priority || 'normal',
        status: 'pending'
      })
      .select(`
        *,
        requester:admin_users!task_help_requests_requester_id_fkey(id, name, username, avatar),
        assigned_user:admin_users!task_help_requests_assigned_to_fkey(id, name, username, avatar)
      `)
      .single();

    if (error) {
      console.error('Error creating help request:', error);
      return NextResponse.json({ error: 'فشل إنشاء طلب المساعدة' }, { status: 500 });
    }

    // تسجيل النشاط
    await supabase.from('task_activity_log').insert({
      task_id: taskId,
      user_id: userId,
      action: 'help_requested',
      details: { help_request_id: helpRequest.id, priority }
    });

    return NextResponse.json({ help_request: helpRequest }, { status: 201 });
  } catch (error) {
    console.error('POST help request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/tasks/[id]/help-request - تحديث طلب مساعدة
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { help_request_id, status, resolution_notes, assigned_to } = await request.json();

    if (!help_request_id) {
      return NextResponse.json({ error: 'معرف طلب المساعدة مطلوب' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // التحقق من الصلاحية
    const { data: user } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', userId)
      .single();

    const isManagerOrAdmin = ['super_admin', 'admin', 'team_leader', 'manager'].includes(user?.role || '');

    // جلب طلب المساعدة الحالي
    const { data: currentRequest } = await supabase
      .from('task_help_requests')
      .select('requester_id, assigned_to')
      .eq('id', help_request_id)
      .single();

    if (!currentRequest) {
      return NextResponse.json({ error: 'طلب المساعدة غير موجود' }, { status: 404 });
    }

    // التحقق من الصلاحية
    const canUpdate = isManagerOrAdmin || 
                      currentRequest.requester_id === userId || 
                      currentRequest.assigned_to === userId;

    if (!canUpdate) {
      return NextResponse.json({ error: 'غير مصرح بتحديث هذا الطلب' }, { status: 403 });
    }

    // بناء كائن التحديث
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status) updateData.status = status;
    if (resolution_notes) updateData.resolution_notes = resolution_notes;
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to;

    // إذا تم حل الطلب
    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_by = userId;
      updateData.resolved_at = new Date().toISOString();
    }

    // تحديث طلب المساعدة
    const { data: updatedRequest, error } = await supabase
      .from('task_help_requests')
      .update(updateData)
      .eq('id', help_request_id)
      .select(`
        *,
        requester:admin_users!task_help_requests_requester_id_fkey(id, name, username, avatar),
        assigned_user:admin_users!task_help_requests_assigned_to_fkey(id, name, username, avatar),
        resolver:admin_users!task_help_requests_resolved_by_fkey(id, name, username)
      `)
      .single();

    if (error) {
      console.error('Error updating help request:', error);
      return NextResponse.json({ error: 'فشل تحديث طلب المساعدة' }, { status: 500 });
    }

    return NextResponse.json({ help_request: updatedRequest });
  } catch (error) {
    console.error('PUT help request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
