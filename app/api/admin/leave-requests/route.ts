import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

async function getCurrentUserId(request: Request) {
  const cookieStore = cookies();
  const adminUserCookie = cookieStore.get('admin_user');
  
  if (adminUserCookie) {
    try {
      const adminUser = JSON.parse(adminUserCookie.value);
      if (adminUser.id) return adminUser.id;
    } catch (e) {
    }
  }
  
  try {
    const clonedRequest = request.clone();
    const body = await clonedRequest.json();
    if (body.user_id) return body.user_id;
  } catch (e) {
    // ignore
  }
  
  const userIdHeader = request.headers.get('x-user-id');
  if (userIdHeader) return userIdHeader;
  
  return null;
}

// جلب طلبات الإجازة والاستئذان
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        user:admin_users!leave_requests_user_id_fkey(id, name, username, role, roles)
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ requests: [], message: 'جدول الطلبات غير موجود' });
      }
      return NextResponse.json({ requests: [] });
    }

    return NextResponse.json({ requests: data || [] });

  } catch (error) {
    return NextResponse.json({ requests: [] });
  }
}

// إنشاء طلب جديد
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { type, start_date, end_date, start_time, end_time, reason, user_id: bodyUserId, leave_category, medical_report_url } = body;

    const userId = bodyUserId || await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }

    // التحقق من نوع الطلب
    if (!type || !['leave', 'permission'].includes(type)) {
      return NextResponse.json({ error: 'نوع الطلب غير صحيح' }, { status: 400 });
    }

    // التحقق من البيانات المطلوبة
    if (type === 'leave' && (!start_date || !end_date)) {
      return NextResponse.json({ error: 'يجب تحديد تاريخ بداية ونهاية الإجازة' }, { status: 400 });
    }

    if (type === 'permission' && (!start_date || !start_time || !end_time)) {
      return NextResponse.json({ error: 'يجب تحديد التاريخ ووقت الاستئذان' }, { status: 400 });
    }

    if (!reason || reason.trim() === '') {
      return NextResponse.json({ error: 'يجب كتابة سبب الطلب' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        user_id: userId,
        type,
        start_date,
        end_date: type === 'leave' ? end_date : start_date,
        start_time: type === 'permission' ? start_time : null,
        end_time: type === 'permission' ? end_time : null,
        reason,
        leave_category: type === 'leave' ? (leave_category || 'regular') : null,
        medical_report_url: leave_category === 'sick' ? medical_report_url : null,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'فشل في إنشاء الطلب' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: type === 'leave' ? 'تم إرسال طلب الإجازة بنجاح' : 'تم إرسال طلب الاستئذان بنجاح',
      request: data 
    });

  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// تحديث حالة الطلب (للمسؤولين)
export async function PUT(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { request_id, status, admin_notes } = body;

    if (!request_id || !status) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'حالة غير صحيحة' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status,
        admin_notes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', request_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'فشل في تحديث الطلب' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: status === 'approved' ? 'تمت الموافقة على الطلب' : 'تم رفض الطلب',
      request: data 
    });

  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
