import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// جلب جميع التعاميم
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const search = searchParams.get('search');

    let query = supabase
      .from('announcements')
      .select(`
        *,
        creator:admin_users!created_by(id, name, username, avatar),
        target_users:announcement_target_users(
          user:admin_users(id, name, username, avatar)
        ),
        reads:announcement_reads(count),
        conditions:announcement_conditions(*)
      `)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (department) {
      query = query.eq('target_department_id', department);
    }
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data: announcements, error } = await query;

    if (error) {
      console.error('Error fetching announcements:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ announcements: [], message: 'جدول التعاميم غير موجود' });
      }
      return NextResponse.json({ announcements: [] });
    }

    return NextResponse.json({ announcements: announcements || [] });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ announcements: [] });
  }
}

// إنشاء تعميم جديد
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { 
      title, 
      content, 
      type, 
      priority, 
      target_type, 
      target_department_id,
      target_users,
      channels,
      send_at,
      conditions,
      status,
      created_by
    } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'العنوان والمحتوى مطلوبان' }, { status: 400 });
    }

    // إنشاء التعميم
    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        type: type || 'normal',
        priority: priority || 'normal',
        target_type: target_type || 'all',
        target_department_id: target_department_id || null,
        channels: channels || ['in_app'],
        send_at: send_at || null,
        status: status || 'draft',
        is_automated: type === 'conditional' || type === 'scheduled',
        created_by,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      return NextResponse.json({ error: 'فشل في إنشاء التعميم' }, { status: 500 });
    }

    // إضافة المستخدمين المستهدفين إذا كان الاستهداف محدد
    if (target_type === 'users' && target_users && target_users.length > 0) {
      const targetRecords = target_users.map((userId: string) => ({
        announcement_id: announcement.id,
        user_id: userId
      }));

      await supabase.from('announcement_target_users').insert(targetRecords);
    }

    // إضافة الشروط إذا كان التعميم مشروطاً
    if (type === 'conditional' && conditions && conditions.length > 0) {
      const conditionRecords = conditions.map((cond: any) => ({
        announcement_id: announcement.id,
        field: cond.field,
        operator: cond.operator,
        value: cond.value
      }));

      await supabase.from('announcement_conditions').insert(conditionRecords);
    }

    // إذا كان الإرسال فوري
    if (status === 'sent') {
      await sendAnnouncement(supabase, announcement.id, target_type, target_department_id, target_users);
    }

    return NextResponse.json({ 
      success: true, 
      message: status === 'sent' ? 'تم إرسال التعميم بنجاح' : 'تم حفظ التعميم بنجاح',
      announcement 
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// تعديل تعميم
export async function PUT(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { 
      id,
      title, 
      content, 
      type, 
      priority, 
      target_type, 
      target_department_id,
      target_users,
      channels,
      send_at,
      conditions,
      status
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف التعميم مطلوب' }, { status: 400 });
    }

    // تحديث التعميم
    const { data: announcement, error } = await supabase
      .from('announcements')
      .update({
        title,
        content,
        type,
        priority,
        target_type,
        target_department_id,
        channels,
        send_at,
        status,
        is_automated: type === 'conditional' || type === 'scheduled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating announcement:', error);
      return NextResponse.json({ error: 'فشل في تعديل التعميم' }, { status: 500 });
    }

    // تحديث المستخدمين المستهدفين
    if (target_type === 'users') {
      await supabase.from('announcement_target_users').delete().eq('announcement_id', id);
      
      if (target_users && target_users.length > 0) {
        const targetRecords = target_users.map((userId: string) => ({
          announcement_id: id,
          user_id: userId
        }));
        await supabase.from('announcement_target_users').insert(targetRecords);
      }
    }

    // تحديث الشروط
    if (type === 'conditional') {
      await supabase.from('announcement_conditions').delete().eq('announcement_id', id);
      
      if (conditions && conditions.length > 0) {
        const conditionRecords = conditions.map((cond: any) => ({
          announcement_id: id,
          field: cond.field,
          operator: cond.operator,
          value: cond.value
        }));
        await supabase.from('announcement_conditions').insert(conditionRecords);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم تعديل التعميم بنجاح',
      announcement 
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// حذف تعميم
export async function DELETE(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف التعميم مطلوب' }, { status: 400 });
    }

    // حذف السجلات المرتبطة أولاً
    await supabase.from('announcement_reads').delete().eq('announcement_id', id);
    await supabase.from('announcement_target_users').delete().eq('announcement_id', id);
    await supabase.from('announcement_conditions').delete().eq('announcement_id', id);

    // حذف التعميم
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting announcement:', error);
      return NextResponse.json({ error: 'فشل في حذف التعميم' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم حذف التعميم بنجاح'
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// دالة إرسال التعميم
async function sendAnnouncement(
  supabase: any, 
  announcementId: string, 
  targetType: string, 
  targetDepartmentId: string | null,
  targetUsers: string[] | null
) {
  let usersToNotify: string[] = [];

  if (targetType === 'all') {
    // جلب جميع المستخدمين
    const { data: users } = await supabase
      .from('admin_users')
      .select('id');
    usersToNotify = users?.map((u: any) => u.id) || [];
  } else if (targetType === 'department' && targetDepartmentId) {
    // جلب مستخدمي القسم
    const { data: users } = await supabase
      .from('admin_users')
      .select('id')
      .eq('department_id', targetDepartmentId);
    usersToNotify = users?.map((u: any) => u.id) || [];
  } else if (targetType === 'users' && targetUsers) {
    usersToNotify = targetUsers;
  }

  // إنشاء سجلات القراءة (غير مقروءة)
  if (usersToNotify.length > 0) {
    const readRecords = usersToNotify.map(userId => ({
      announcement_id: announcementId,
      user_id: userId,
      read_at: null
    }));

    await supabase.from('announcement_reads').insert(readRecords);
  }

  // تحديث حالة التعميم
  await supabase
    .from('announcements')
    .update({ 
      status: 'sent', 
      sent_at: new Date().toISOString() 
    })
    .eq('id', announcementId);
}
