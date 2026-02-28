import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

    // جلب البيانات بالتوازي — RPCs + targeted queries بدل "جلب كل شيء"
    const [
      kpisResult,
      employeeResult,
      storeTasksResult,
      overdueTasksResult,
      todayTasksResult,
      announcementsResult
    ] = await Promise.all([
      // KPIs — RPC واحد بدل 4+ queries
      supabase.rpc('get_dashboard_kpis'),
      // أداء الموظفين — RPC بدل O(n²) JS
      supabase.rpc('get_employee_performance'),
      // أداء المتاجر — RPC بدل O(n²) JS
      supabase.rpc('get_store_tasks_counts'),
      // مهام متأخرة (أول 8 فقط) — للـ Action Center
      supabase.from('store_tasks')
        .select('id, title, status, due_date, store_id, assigned_to')
        .not('status', 'in', '("done","canceled")')
        .not('due_date', 'is', null)
        .lt('due_date', now.toISOString())
        .order('due_date', { ascending: true })
        .limit(8),
      // مهام اليوم (أول 8 فقط)
      supabase.from('store_tasks')
        .select('id, title, status, due_date, store_id, assigned_to')
        .not('status', 'in', '("done","canceled")')
        .gte('due_date', todayStart.toISOString())
        .lt('due_date', todayEnd.toISOString())
        .limit(8),
      // آخر 5 تعاميم
      supabase.from('announcements')
        .select('id, title, type, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    // Fallback: إذا RPCs غير موجودة، استخدم القيم الافتراضية
    const kpis = kpisResult.data || {
      overdue_tasks: 0, today_tasks: 0, completed_this_week: 0,
      active_stores: 0, total_stores: 0, total_users: 0,
      unread_announcements: 0, total_tasks_pending: 0, total_tasks_in_progress: 0
    };

    const employees: any[] = employeeResult.data || [];
    const storeTasksCounts: any[] = storeTasksResult.data || [];
    const overdueTasks = overdueTasksResult.data || [];
    const todayTasks = todayTasksResult.data || [];
    const announcements = announcementsResult.data || [];

    // أفضل 5 موظفين
    const topPerformers = employees
      .sort((a: any, b: any) => (b.completed_this_week || 0) - (a.completed_this_week || 0))
      .slice(0, 5)
      .map((u: any) => ({
        id: u.id, name: u.name, username: u.username, avatar: u.avatar, role: u.role,
        totalTasks: u.total_tasks, completedTasks: u.completed_tasks,
        overdueTasks: u.overdue_tasks, completedThisWeek: u.completed_this_week,
        completionRate: u.completion_rate
      }));

    // أسوأ 5 موظفين
    const lowPerformers = employees
      .filter((u: any) => (u.overdue_tasks || 0) > 0)
      .sort((a: any, b: any) => (b.overdue_tasks || 0) - (a.overdue_tasks || 0))
      .slice(0, 5)
      .map((u: any) => ({
        id: u.id, name: u.name, username: u.username, avatar: u.avatar, role: u.role,
        totalTasks: u.total_tasks, completedTasks: u.completed_tasks,
        overdueTasks: u.overdue_tasks, completedThisWeek: u.completed_this_week,
        completionRate: u.completion_rate
      }));

    // أداء المتاجر — من RPC مباشرة
    const storePerformance = storeTasksCounts.map((s: any) => ({
      id: s.store_id,
      store_url: s.store_url,
      is_active: s.is_active !== false,
      openTasks: s.open_tasks || 0,
      overdueTasks: s.overdue_tasks || 0,
      activeCampaigns: 0,
      totalCampaigns: 0,
      needsAttention: (s.overdue_tasks || 0) > 0 || (s.open_tasks || 0) === 0
    }));

    // جلب أسماء المتاجر والمستخدمين للـ Action Center (targeted)
    const storeIds = [...new Set([...overdueTasks, ...todayTasks].map((t: any) => t.store_id).filter(Boolean))];
    const userIds = [...new Set([...overdueTasks, ...todayTasks].map((t: any) => t.assigned_to).filter(Boolean))];

    let storeMap: Record<string, string> = {};
    let userMap: Record<string, string> = {};

    if (storeIds.length > 0) {
      const { data: storeNames } = await supabase.from('stores').select('id, store_url').in('id', storeIds);
      (storeNames || []).forEach((s: any) => { storeMap[s.id] = s.store_url; });
    }
    if (userIds.length > 0) {
      const { data: userNames } = await supabase.from('admin_users').select('id, name').in('id', userIds);
      (userNames || []).forEach((u: any) => { userMap[u.id] = u.name; });
    }

    // العناصر الحرجة (Action Center)
    const criticalItems: any[] = [];

    overdueTasks.slice(0, 3).forEach((task: any) => {
      criticalItems.push({
        type: 'overdue_task',
        title: task.title,
        description: `مهمة متأخرة - ${storeMap[task.store_id] || 'غير محدد'}`,
        assignee: userMap[task.assigned_to],
        link: `/admin/tasks`,
        priority: 'high'
      });
    });

    lowPerformers.filter((u: any) => u.overdueTasks >= 3).slice(0, 2).forEach((user: any) => {
      criticalItems.push({
        type: 'employee_overdue',
        title: `${user.name} - ${user.overdueTasks} مهام متأخرة`,
        description: 'يحتاج إعادة توزيع المهام',
        link: `/admin/users/${user.id}`,
        priority: 'medium'
      });
    });

    const urgentAnnouncements = announcements.filter((a: any) => a.type === 'urgent' && a.status === 'sent');
    urgentAnnouncements.slice(0, 2).forEach((ann: any) => {
      criticalItems.push({
        type: 'urgent_announcement',
        title: ann.title,
        description: 'تعميم عاجل',
        link: `/admin/announcements`,
        priority: 'high'
      });
    });

    storePerformance.filter(s => s.needsAttention).slice(0, 2).forEach(store => {
      criticalItems.push({
        type: 'store_attention',
        title: store.store_url,
        description: store.overdueTasks > 0 
          ? `${store.overdueTasks} مهام متأخرة`
          : 'بدون مهام نشطة',
        link: `/admin/stores/${store.id}`,
        priority: 'medium'
      });
    });

    // التوصيات الذكية
    const smartInsights: any[] = [];
    storePerformance.filter(s => s.openTasks === 0 && s.is_active).slice(0, 3).forEach(store => {
      smartInsights.push({
        type: 'inactive_store', icon: '🏪',
        message: `متجر "${store.store_url}" بدون مهام مفتوحة`,
        action: 'إضافة مهام جديدة', link: `/admin/stores/${store.id}`
      });
    });
    lowPerformers.filter((u: any) => u.overdueTasks >= 3).slice(0, 2).forEach((user: any) => {
      smartInsights.push({
        type: 'overloaded_employee', icon: '👤',
        message: `${user.name} لديه ${user.overdueTasks} مهام متأخرة`,
        action: 'إعادة توزيع المهام', link: `/admin/users/${user.id}`
      });
    });

    // مهام اليوم + المتأخرة
    const todayTasksList = [...todayTasks, ...overdueTasks]
      .slice(0, 8)
      .map((task: any) => ({
        id: task.id, title: task.title,
        store: storeMap[task.store_id] || 'غير محدد',
        assignee: userMap[task.assigned_to] || 'غير مكلف',
        status: task.status,
        isOverdue: task.due_date && new Date(task.due_date) < now,
        dueDate: task.due_date
      }));

    // آخر التعاميم
    const recentAnnouncements = announcements.map((ann: any) => ({
      id: ann.id, title: ann.title, type: ann.type,
      status: ann.status, createdAt: ann.created_at
    }));

    return NextResponse.json({
      kpis: {
        overdueTasks: kpis.overdue_tasks || 0,
        todayTasks: kpis.today_tasks || 0,
        completedThisWeek: kpis.completed_this_week || 0,
        activeStores: kpis.active_stores || 0,
        totalStores: kpis.total_stores || 0,
        activeCampaigns: 0,
        dailySpend: 0,
        monthlySpend: 0,
        averageRoas: 0,
        unreadAnnouncements: kpis.unread_announcements || 0
      },
      criticalItems: criticalItems.slice(0, 6),
      storePerformance,
      topPerformers,
      lowPerformers,
      todayTasks: todayTasksList,
      recentAnnouncements,
      smartInsights: smartInsights.slice(0, 5),
      campaignStats: {
        totalActive: 0, dailySpend: 0,
        bestCampaign: null, worstCampaign: null, noConversions: []
      }
    }, {
      headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=60' }
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
