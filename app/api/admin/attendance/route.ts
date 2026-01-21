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
  // محاولة قراءة من الكوكيز
  const cookieStore = cookies();
  const adminUserCookie = cookieStore.get('admin_user');
  
  if (adminUserCookie) {
    try {
      const adminUser = JSON.parse(adminUserCookie.value);
      if (adminUser.id) return adminUser.id;
    } catch (e) {
      console.error('Error parsing admin user cookie:', e);
    }
  }
  
  // محاولة قراءة من الـ body إذا كان POST/PUT
  try {
    const clonedRequest = request.clone();
    const body = await clonedRequest.json();
    if (body.user_id) return body.user_id;
  } catch (e) {
    // ignore
  }
  
  // محاولة قراءة من header
  const userIdHeader = request.headers.get('x-user-id');
  if (userIdHeader) return userIdHeader;
  
  return null;
}

// جلب سجلات الحضور
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const date = searchParams.get('date');
    const month = searchParams.get('month'); // YYYY-MM format
    
    let query = supabase
      .from('attendance')
      .select(`
        *,
        user:admin_users(id, name, username, role, roles)
      `)
      .order('check_in_time', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (date) {
      query = query.eq('date', date);
    }

    if (month) {
      const startDate = `${month}-01`;
      const endDate = `${month}-31`;
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data: records, error } = await query.limit(100);

    if (error) {
      console.error('Error fetching attendance:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ records: [], message: 'جدول الحضور غير موجود' });
      }
      return NextResponse.json({ records: [] });
    }

    // جلب حالة اليوم للمستخدم الحالي
    const currentUserId = userId || await getCurrentUserId(request);
    let todayStatus = null;
    
    if (currentUserId) {
      const today = new Date().toISOString().split('T')[0];
      const { data: todayRecord } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('date', today)
        .single();
      
      todayStatus = todayRecord;
    }

    return NextResponse.json({ 
      records: records || [],
      todayStatus
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ records: [], error: 'حدث خطأ' });
  }
}

// تسجيل حضور
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { device_info, location, notes, user_id: bodyUserId } = body;

    const userId = bodyUserId || await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // التحقق من عدم وجود تسجيل حضور سابق لليوم
    const { data: existingRecord } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (existingRecord) {
      return NextResponse.json({ 
        error: 'تم تسجيل الحضور مسبقاً لهذا اليوم',
        record: existingRecord 
      }, { status: 400 });
    }

    // تسجيل الحضور
    const { data, error } = await supabase
      .from('attendance')
      .insert({
        user_id: userId,
        date: today,
        check_in_time: now,
        device_info: device_info || null,
        device_type: getDeviceType(device_info),
        browser: getBrowser(device_info),
        ip_address: null, // يمكن إضافتها لاحقاً
        location: location || null,
        notes: notes || null,
        status: 'present'
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording check-in:', error);
      return NextResponse.json({ error: 'فشل في تسجيل الحضور' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم تسجيل الحضور بنجاح',
      record: data 
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// تسجيل انصراف
export async function PUT(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { notes, user_id: bodyUserId } = body;

    const userId = bodyUserId || await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // البحث عن سجل الحضور لليوم
    const { data: existingRecord } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (!existingRecord) {
      return NextResponse.json({ 
        error: 'لم يتم تسجيل الحضور لهذا اليوم'
      }, { status: 400 });
    }

    if (existingRecord.check_out_time) {
      return NextResponse.json({ 
        error: 'تم تسجيل الانصراف مسبقاً',
        record: existingRecord 
      }, { status: 400 });
    }

    // حساب ساعات العمل
    const checkInTime = new Date(existingRecord.check_in_time);
    const checkOutTime = new Date(now);
    const workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

    // تسجيل الانصراف
    const { data, error } = await supabase
      .from('attendance')
      .update({
        check_out_time: now,
        work_hours: Math.round(workHours * 100) / 100,
        notes: notes ? `${existingRecord.notes || ''}\n${notes}`.trim() : existingRecord.notes
      })
      .eq('id', existingRecord.id)
      .select()
      .single();

    if (error) {
      console.error('Error recording check-out:', error);
      return NextResponse.json({ error: 'فشل في تسجيل الانصراف' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم تسجيل الانصراف بنجاح',
      record: data 
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// دوال مساعدة لتحديد نوع الجهاز والمتصفح
function getDeviceType(userAgent: string | null): string {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  }
  return 'desktop';
}

function getBrowser(userAgent: string | null): string {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('edg')) return 'Edge';
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera';
  return 'Other';
}
