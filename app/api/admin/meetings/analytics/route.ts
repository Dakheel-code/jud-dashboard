/**
 * API: إحصائيات الاجتماعات المتقدمة
 * GET /api/admin/meetings/analytics
 * 
 * يستدعي RPC functions من Supabase للحصول على إحصائيات محسوبة
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getCurrentUser(): Promise<{ id: string; role: string } | null> {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('admin_user');
    if (userCookie?.value) {
      const user = JSON.parse(userCookie.value);
      return { id: user.id, role: user.role };
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'غير مصرح', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const employeeId = searchParams.get('employee_id');
    const type = searchParams.get('type') || 'full'; // full, kpis, heatmap, trends

    const supabase = getSupabase();

    // تحديد الفترة
    const params: Record<string, any> = {};
    if (startDate) params.p_start_date = startDate;
    if (endDate) params.p_end_date = endDate;
    
    // إذا كان المستخدم ليس admin، يرى فقط إحصائياته
    if (!['admin', 'super_admin'].includes(user.role)) {
      params.p_employee_id = user.id;
    } else if (employeeId) {
      params.p_employee_id = employeeId;
    }

    let result: any;

    switch (type) {
      case 'kpis':
        const { data: kpis, error: kpisError } = await supabase.rpc('admin_meeting_kpis', params);
        if (kpisError) throw kpisError;
        result = { kpis };
        break;

      case 'heatmap':
        const { data: heatmap, error: heatmapError } = await supabase.rpc('admin_meeting_heatmap', params);
        if (heatmapError) throw heatmapError;
        result = { heatmap };
        break;

      case 'by_employee':
        const { data: byEmployee, error: byEmployeeError } = await supabase.rpc('admin_meeting_by_employee', {
          p_start_date: params.p_start_date,
          p_end_date: params.p_end_date,
        });
        if (byEmployeeError) throw byEmployeeError;
        result = { by_employee: byEmployee };
        break;

      case 'by_type':
        const { data: byType, error: byTypeError } = await supabase.rpc('admin_meeting_by_type', params);
        if (byTypeError) throw byTypeError;
        result = { by_type: byType };
        break;

      case 'trends':
        const granularity = searchParams.get('granularity') || 'day';
        const { data: trends, error: trendsError } = await supabase.rpc('admin_meeting_trends', {
          ...params,
          p_granularity: granularity,
        });
        if (trendsError) throw trendsError;
        result = { trends };
        break;

      case 'top_clients':
        const limit = parseInt(searchParams.get('limit') || '10');
        const { data: topClients, error: topClientsError } = await supabase.rpc('admin_top_clients', {
          ...params,
          p_limit: limit,
        });
        if (topClientsError) throw topClientsError;
        result = { top_clients: topClients };
        break;

      case 'full':
      default:
        const { data: full, error: fullError } = await supabase.rpc('admin_meeting_analytics_full', params);
        if (fullError) throw fullError;
        result = full;
        break;
    }

    return NextResponse.json({
      success: true,
      ...result,
      period: {
        start_date: startDate || 'last_30_days',
        end_date: endDate || 'now',
      },
    });

  } catch (error: any) {
    
    // إذا كانت الـ functions غير موجودة، نرجع بيانات محسوبة يدوياً
    if (error.code === '42883' || error.message?.includes('function')) {
      return await getFallbackAnalytics(request);
    }
    
    return NextResponse.json(
      { error: 'حدث خطأ في جلب الإحصائيات', code: 'INTERNAL_ERROR', details: error.message },
      { status: 500 }
    );
  }
}

// Fallback: حساب الإحصائيات يدوياً إذا لم تكن الـ functions موجودة
async function getFallbackAnalytics(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = searchParams.get('end_date') || new Date().toISOString();
  const employeeId = !['admin', 'super_admin'].includes(user.role) ? user.id : searchParams.get('employee_id');

  const supabase = getSupabase();

  // جلب الاجتماعات
  let query = supabase
    .from('meetings')
    .select('*')
    .gte('start_at', startDate)
    .lte('start_at', endDate);

  if (employeeId) {
    query = query.eq('employee_id', employeeId);
  }

  const { data: meetings, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'فشل جلب البيانات' }, { status: 500 });
  }

  const total = meetings?.length || 0;
  const completed = meetings?.filter(m => m.status === 'completed').length || 0;
  const cancelled = meetings?.filter(m => m.status === 'cancelled').length || 0;
  const noShow = meetings?.filter(m => m.status === 'no_show').length || 0;
  const confirmed = meetings?.filter(m => m.status === 'confirmed').length || 0;

  // حساب معدلات
  const noShowRate = (completed + noShow) > 0 ? Math.round((noShow / (completed + noShow)) * 100 * 100) / 100 : 0;
  const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100 * 100) / 100 : 0;

  // حساب متوسط وقت الحجز المسبق
  let avgLeadTime = 0;
  if (meetings && meetings.length > 0) {
    const leadTimes = meetings.map(m => {
      const start = new Date(m.start_at).getTime();
      const created = new Date(m.created_at).getTime();
      return (start - created) / (1000 * 60 * 60); // بالساعات
    });
    avgLeadTime = Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length * 10) / 10;
  }

  // العملاء المتكررون
  const clientCounts = new Map<string, number>();
  meetings?.forEach(m => {
    clientCounts.set(m.client_email, (clientCounts.get(m.client_email) || 0) + 1);
  });
  const repeatClients = Array.from(clientCounts.values()).filter(c => c > 1).length;
  const uniqueClients = clientCounts.size;

  // حسب اليوم
  const byDay = [0, 1, 2, 3, 4, 5, 6].map(day => {
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const count = meetings?.filter(m => new Date(m.start_at).getDay() === day).length || 0;
    return { day, day_name: dayNames[day], count };
  });

  // حسب الساعة
  const byHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: meetings?.filter(m => new Date(m.start_at).getHours() === hour).length || 0,
  })).filter(h => h.hour >= 8 && h.hour <= 19);

  return NextResponse.json({
    success: true,
    kpis: {
      total_meetings: total,
      by_status: { confirmed, completed, cancelled, no_show: noShow },
      no_show_rate: noShowRate,
      cancellation_rate: cancellationRate,
      avg_lead_time_hours: avgLeadTime,
      repeat_clients: repeatClients,
      unique_clients: uniqueClients,
      today_meetings: meetings?.filter(m => {
        const today = new Date();
        const meetingDate = new Date(m.start_at);
        return meetingDate.toDateString() === today.toDateString() && m.status === 'confirmed';
      }).length || 0,
      upcoming_meetings: meetings?.filter(m => new Date(m.start_at) > new Date() && m.status === 'confirmed').length || 0,
      avg_duration_minutes: meetings && meetings.length > 0 
        ? Math.round(meetings.reduce((a, m) => a + m.duration_minutes, 0) / meetings.length)
        : 0,
    },
    heatmap: {
      by_day: byDay,
      by_hour: byHour,
    },
    fallback: true,
  });
}
