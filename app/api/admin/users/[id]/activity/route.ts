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

// جلب إحصائيات نشاط المستخدم
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const userId = params.id;

    // جلب إجمالي وقت التصفح (آخر 30 يوم)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: sessions } = await supabase
      .from('user_sessions')
      .select('total_seconds, session_date')
      .eq('user_id', userId)
      .gte('session_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('session_date', { ascending: false });

    // حساب إجمالي الساعات
    const totalSeconds = (sessions || []).reduce((sum, s) => sum + (s.total_seconds || 0), 0);
    const totalHours = Math.round((totalSeconds / 3600) * 10) / 10; // تقريب لرقم عشري واحد

    // جلب عدد العمليات (آخر 30 يوم)
    const { data: activities, error: activitiesError } = await supabase
      .from('user_activity_logs')
      .select('action_type, entity_type, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // تصنيف العمليات
    const activityStats = {
      total_actions: (activities || []).length,
      creates: (activities || []).filter(a => a.action_type === 'create').length,
      updates: (activities || []).filter(a => a.action_type === 'update').length,
      deletes: (activities || []).filter(a => a.action_type === 'delete').length,
      task_completions: (activities || []).filter(a => a.action_type === 'complete_task').length,
      views: (activities || []).filter(a => a.action_type === 'view').length,
    };

    // تصنيف حسب نوع الكيان
    const entityStats = {
      stores: (activities || []).filter(a => a.entity_type === 'store').length,
      tasks: (activities || []).filter(a => a.entity_type === 'task').length,
      users: (activities || []).filter(a => a.entity_type === 'user').length,
      campaigns: (activities || []).filter(a => a.entity_type === 'campaign').length,
    };

    // آخر 7 أيام للرسم البياني
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySession = (sessions || []).find(s => s.session_date === dateStr);
      const dayActivities = (activities || []).filter(a => 
        a.created_at.split('T')[0] === dateStr
      );

      last7Days.push({
        date: dateStr,
        hours: daySession ? Math.round((daySession.total_seconds / 3600) * 10) / 10 : 0,
        actions: dayActivities.length
      });
    }

    // آخر 10 نشاطات
    const recentActivities = (activities || []).slice(0, 10).map(a => ({
      action_type: a.action_type,
      entity_type: a.entity_type,
      created_at: a.created_at
    }));

    return NextResponse.json({
      browsing: {
        total_hours_30_days: totalHours,
        total_seconds_30_days: totalSeconds,
        sessions_count: (sessions || []).length,
        daily_sessions: sessions || []
      },
      activity: {
        ...activityStats,
        by_entity: entityStats
      },
      chart_data: last7Days,
      recent_activities: recentActivities
    });

  } catch (error) {
    // إرجاع قيم افتراضية في حالة الخطأ
    return NextResponse.json({
      browsing: {
        total_hours_30_days: 0,
        total_seconds_30_days: 0,
        sessions_count: 0,
        daily_sessions: []
      },
      activity: {
        total_actions: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
        task_completions: 0,
        views: 0,
        by_entity: { stores: 0, tasks: 0, users: 0, campaigns: 0 }
      },
      chart_data: [],
      recent_activities: []
    });
  }
}
