/**
 * API: إحصائيات الاجتماعات الشاملة (للإدارة)
 * GET /api/admin/meetings/stats/all
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
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (!['admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    const supabase = getSupabase();
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // جلب جميع الاجتماعات في الفترة
    const { data: meetings, error } = await supabase
      .from('meetings')
      .select('id, employee_id, status, start_at, duration_minutes')
      .gte('start_at', startDate.toISOString());

    if (error) {
      console.error('Error fetching meetings:', error);
      return NextResponse.json({ error: 'فشل جلب البيانات' }, { status: 500 });
    }

    // جلب الموظفين
    const { data: employees } = await supabase
      .from('admin_users')
      .select('id, name');

    const employeeMap = new Map(employees?.map(e => [e.id, e.name]) || []);

    // حساب الإحصائيات
    const total = meetings?.length || 0;
    const completed = meetings?.filter(m => m.status === 'completed').length || 0;
    const cancelled = meetings?.filter(m => m.status === 'cancelled').length || 0;
    const no_show = meetings?.filter(m => m.status === 'no_show').length || 0;
    const upcoming = meetings?.filter(m => m.status === 'confirmed' && new Date(m.start_at) > now).length || 0;

    // اليوم
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayMeetings = meetings?.filter(m => {
      const d = new Date(m.start_at);
      return d >= today && d < tomorrow;
    }).length || 0;

    // هذا الأسبوع
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const thisWeek = meetings?.filter(m => new Date(m.start_at) >= weekStart).length || 0;

    // هذا الشهر
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = meetings?.filter(m => new Date(m.start_at) >= monthStart).length || 0;

    // حسب الموظف
    const byEmployeeMap = new Map<string, { total: number; completed: number; cancelled: number }>();
    meetings?.forEach(m => {
      const current = byEmployeeMap.get(m.employee_id) || { total: 0, completed: 0, cancelled: 0 };
      current.total++;
      if (m.status === 'completed') current.completed++;
      if (m.status === 'cancelled') current.cancelled++;
      byEmployeeMap.set(m.employee_id, current);
    });

    const by_employee = Array.from(byEmployeeMap.entries()).map(([id, data]) => ({
      employee_id: id,
      employee_name: employeeMap.get(id) || 'غير معروف',
      ...data,
    })).sort((a, b) => b.total - a.total);

    // حسب اليوم
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const byDayMap = new Map<number, number>();
    meetings?.forEach(m => {
      const day = new Date(m.start_at).getDay();
      byDayMap.set(day, (byDayMap.get(day) || 0) + 1);
    });

    const by_day = dayNames.map((name, index) => ({
      day: name,
      count: byDayMap.get(index) || 0,
    }));

    // حسب الساعة
    const byHourMap = new Map<number, number>();
    meetings?.forEach(m => {
      const hour = new Date(m.start_at).getHours();
      byHourMap.set(hour, (byHourMap.get(hour) || 0) + 1);
    });

    const by_hour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: byHourMap.get(hour) || 0,
    })).filter(h => h.hour >= 8 && h.hour <= 19);

    return NextResponse.json({
      success: true,
      stats: {
        total,
        today: todayMeetings,
        this_week: thisWeek,
        this_month: thisMonth,
        upcoming,
        completed,
        cancelled,
        no_show,
        by_employee,
        by_day,
        by_hour,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/meetings/stats/all:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
