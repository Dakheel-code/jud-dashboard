import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// تسجيل نشاط جديد
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    
    const { action_type, action_description, entity_type, entity_id } = body;

    // جلب معلومات المستخدم الحالي من الكوكيز
    const cookieStore = cookies();
    const adminUserCookie = cookieStore.get('admin_user');
    let userId = null;
    
    if (adminUserCookie) {
      try {
        const adminUser = JSON.parse(adminUserCookie.value);
        userId = adminUser.id;
      } catch (e) {
      }
    }

    if (!userId) {
      return NextResponse.json({ success: true });
    }

    const { data, error } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        action_type, // 'create', 'update', 'delete', 'complete_task', 'view'
        action_description,
        entity_type, // 'store', 'task', 'user', 'campaign', etc.
        entity_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // إذا كان الجدول غير موجود، نتجاهل الخطأ
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, message: 'Activity logging not configured' });
      }
      return NextResponse.json({ success: true }); // لا نفشل الطلب الأصلي
    }

    return NextResponse.json({ success: true, activity: data });
  } catch (error) {
    return NextResponse.json({ success: true }); // لا نفشل الطلب الأصلي
  }
}

// تسجيل وقت التصفح (heartbeat)
export async function PUT(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    
    const { session_duration_seconds } = body;

    const cookieStore = cookies();
    const adminUserCookie = cookieStore.get('admin_user');
    let userId = null;
    
    if (adminUserCookie) {
      try {
        const adminUser = JSON.parse(adminUserCookie.value);
        userId = adminUser.id;
      } catch (e) {
      }
    }

    if (!userId) {
      return NextResponse.json({ success: true });
    }

    // تحديث last_login في admin_users (لحالة الاتصال الفوري)
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);

    // تحديث أو إنشاء سجل الجلسة اليومية
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existingSession } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('session_date', today)
      .single();

    if (existingSession) {
      // تحديث الجلسة الموجودة
      await supabase
        .from('user_sessions')
        .update({
          total_seconds: existingSession.total_seconds + session_duration_seconds,
          last_activity: new Date().toISOString()
        })
        .eq('id', existingSession.id);
    } else {
      // إنشاء جلسة جديدة
      await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          session_date: today,
          total_seconds: session_duration_seconds,
          last_activity: new Date().toISOString()
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: true });
  }
}
