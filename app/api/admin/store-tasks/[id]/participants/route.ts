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

// GET /api/admin/store-tasks/:id/participants - جلب المشاركين في المهمة
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const taskId = params.id;

    const { data: participants, error } = await supabase
      .from('task_participants')
      .select(`
        id,
        role,
        notes,
        added_at,
        user:admin_users(id, name, username, avatar),
        added_by_user:admin_users!task_participants_added_by_fkey(id, name, username)
      `)
      .eq('task_id', taskId)
      .order('added_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'فشل جلب المشاركين' }, { status: 500 });
    }

    return NextResponse.json({ participants: participants || [] });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 2.5 POST /api/admin/store-tasks/:id/participants - إضافة مشارك (طلب مساعدة)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const taskId = params.id;
    const body = await request.json();

    const { user_id, role = 'helper', notes } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    // التحقق من وجود المهمة
    const { data: task, error: taskError } = await supabase
      .from('store_tasks')
      .select('id, title')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 });
    }

    // التحقق من وجود المستخدم
    const { data: user, error: userError } = await supabase
      .from('admin_users')
      .select('id, name')
      .eq('id', user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // التحقق من عدم وجود المشارك مسبقاً
    const { data: existing } = await supabase
      .from('task_participants')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', user_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'المستخدم مشارك بالفعل في هذه المهمة' }, { status: 400 });
    }

    // إضافة المشارك
    const { data: participant, error: insertError } = await supabase
      .from('task_participants')
      .insert({
        task_id: taskId,
        user_id,
        role,
        notes: notes || null,
        added_by: currentUserId
      })
      .select(`
        id,
        role,
        notes,
        added_at,
        user:admin_users(id, name, username, avatar)
      `)
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'فشل إضافة المشارك' }, { status: 500 });
    }

    // تسجيل في activity log
    await supabase.from('task_activity_log').insert({
      task_id: taskId,
      user_id: currentUserId,
      action: 'participant_added',
      meta: {
        participant_id: user_id,
        participant_name: user.name,
        role
      }
    });

    return NextResponse.json({
      success: true,
      participant,
      message: 'تم إضافة المشارك بنجاح'
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/store-tasks/:id/participants - إزالة مشارك
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const taskId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    // جلب معلومات المشارك قبل الحذف
    const { data: participant } = await supabase
      .from('task_participants')
      .select('user:admin_users(name)')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .single();

    // حذف المشارك
    const { error } = await supabase
      .from('task_participants')
      .delete()
      .eq('task_id', taskId)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: 'فشل إزالة المشارك' }, { status: 500 });
    }

    // تسجيل في activity log
    await supabase.from('task_activity_log').insert({
      task_id: taskId,
      user_id: currentUserId,
      action: 'participant_removed',
      meta: {
        participant_id: userId,
        participant_name: (participant?.user as any)?.name || 'Unknown'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'تم إزالة المشارك بنجاح'
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
