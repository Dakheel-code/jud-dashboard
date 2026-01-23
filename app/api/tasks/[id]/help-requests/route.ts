import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { notifyHelpRequest } from '@/lib/notifications';

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

// GET /api/tasks/[id]/help-requests - جلب طلبات المساعدة للمهمة
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
        id,
        task_id,
        message,
        status,
        created_at,
        responded_at,
        requester:admin_users!task_help_requests_requester_id_fkey(id, name, username, avatar),
        helper:admin_users!task_help_requests_helper_id_fkey(id, name, username, avatar)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching help requests:', error);
      return NextResponse.json({ error: 'فشل جلب طلبات المساعدة' }, { status: 500 });
    }

    return NextResponse.json({ helpRequests: helpRequests || [] });
  } catch (error) {
    console.error('GET help requests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/help-requests - إنشاء طلب مساعدة جديد
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
    const { helper_id, message } = await request.json();

    if (!helper_id) {
      return NextResponse.json({ error: 'يجب تحديد الشخص المطلوب مساعدته' }, { status: 400 });
    }

    if (helper_id === userId) {
      return NextResponse.json({ error: 'لا يمكنك طلب المساعدة من نفسك' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // التحقق من وجود المساعد
    const { data: helper } = await supabase
      .from('admin_users')
      .select('id, name, is_active')
      .eq('id', helper_id)
      .single();

    if (!helper) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    if (!helper.is_active) {
      return NextResponse.json({ error: 'المستخدم غير نشط' }, { status: 400 });
    }

    // التحقق من عدم وجود طلب معلق سابق لنفس المساعد
    const { data: existingRequest } = await supabase
      .from('task_help_requests')
      .select('id')
      .eq('task_id', taskId)
      .eq('helper_id', helper_id)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json({ error: 'يوجد طلب مساعدة معلق بالفعل لهذا الشخص' }, { status: 400 });
    }

    // إنشاء طلب المساعدة
    const { data: helpRequest, error } = await supabase
      .from('task_help_requests')
      .insert({
        task_id: taskId,
        requester_id: userId,
        helper_id: helper_id,
        message: message?.trim() || null
      })
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
      console.error('Error creating help request:', error);
      return NextResponse.json({ error: 'فشل إنشاء طلب المساعدة' }, { status: 500 });
    }

    // إضافة تعليق SYSTEM
    const systemComment = `[SYSTEM] طلب مساعدة من ${helper.name}`;
    try {
      await supabase.from('task_comments').insert({
        task_id: taskId,
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
        .eq('id', taskId);
    } catch (e) {
      // تجاهل الخطأ
    }

    // إرسال إشعار للمساعد
    try {
      // جلب عنوان المهمة واسم الطالب
      const { data: task } = await supabase
        .from('store_tasks')
        .select('title')
        .eq('id', taskId)
        .single();
      
      const { data: requester } = await supabase
        .from('admin_users')
        .select('name')
        .eq('id', userId)
        .single();

      await notifyHelpRequest(
        helper_id,
        taskId,
        task?.title || 'مهمة',
        requester?.name || 'مستخدم',
        message?.trim() || undefined
      );
    } catch (e) {
      // تجاهل خطأ الإشعار
    }

    return NextResponse.json({ helpRequest }, { status: 201 });
  } catch (error) {
    console.error('POST help request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
