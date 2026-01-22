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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();

    // جلب البيانات بالتوازي
    const [
      tasksResult,
      storesResult,
      usersResult,
      announcementsResult,
      campaignsResult
    ] = await Promise.all([
      // المهام
      supabase.from('tasks').select('id, status, due_date, assigned_to, store_id, title, created_at, completed_at'),
      // المتاجر
      supabase.from('stores').select('id, store_url, is_active, created_at'),
      // المستخدمين
      supabase.from('admin_users').select('id, name, username, avatar, role, is_active'),
      // التعاميم
      supabase.from('announcements').select('id, title, type, status, created_at'),
      // الحملات (إذا وجدت)
      supabase.from('store_campaigns').select('*').catch(() => ({ data: [], error: null }))
    ]);

    const tasks = tasksResult.data || [];
    const stores = storesResult.data || [];
    const users = usersResult.data || [];
    const announcements = announcementsResult.data || [];
    const campaigns = campaignsResult.data || [];

    // حساب KPIs
    const overdueTasks = tasks.filter(t => 
      t.status !== 'completed' && 
      t.due_date && 
      new Date(t.due_date) < new Date()
    );

    const todayTasks = tasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime() && t.status !== 'completed';
    });

    const completedThisWeek = tasks.filter(t => 
      t.status === 'completed' && 
      t.completed_at && 
      new Date(t.completed_at) >= weekAgo
    );

    const activeStores = stores.filter(s => s.is_active !== false);
    
    const activeCampaigns = campaigns.filter((c: any) => c.status === 'active' || c.is_active);

    const unreadAnnouncements = announcements.filter(a => a.status === 'sent');

    // حساب أداء الموظفين
    const userPerformance = users.filter(u => u.is_active).map(user => {
      const userTasks = tasks.filter(t => t.assigned_to === user.id);
      const completedTasks = userTasks.filter(t => t.status === 'completed');
      const overdue = userTasks.filter(t => 
        t.status !== 'completed' && 
        t.due_date && 
        new Date(t.due_date) < new Date()
      );
      const completedThisWeekUser = userTasks.filter(t => 
        t.status === 'completed' && 
        t.completed_at && 
        new Date(t.completed_at) >= weekAgo
      );

      return {
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        totalTasks: userTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdue.length,
        completedThisWeek: completedThisWeekUser.length,
        completionRate: userTasks.length > 0 
          ? Math.round((completedTasks.length / userTasks.length) * 100) 
          : 0
      };
    });

    // أفضل 5 موظفين
    const topPerformers = [...userPerformance]
      .sort((a, b) => b.completedThisWeek - a.completedThisWeek)
      .slice(0, 5);

    // أسوأ 5 موظفين (الأكثر تأخراً)
    const lowPerformers = [...userPerformance]
      .filter(u => u.overdueTasks > 0)
      .sort((a, b) => b.overdueTasks - a.overdueTasks)
      .slice(0, 5);

    // أداء المتاجر
    const storePerformance = stores.map(store => {
      const storeTasks = tasks.filter(t => t.store_id === store.id);
      const openTasks = storeTasks.filter(t => t.status !== 'completed');
      const overdue = storeTasks.filter(t => 
        t.status !== 'completed' && 
        t.due_date && 
        new Date(t.due_date) < new Date()
      );
      const storeCampaigns = campaigns.filter((c: any) => c.store_id === store.id);
      const activeCamps = storeCampaigns.filter((c: any) => c.status === 'active' || c.is_active);

      return {
        id: store.id,
        store_url: store.store_url,
        is_active: store.is_active !== false,
        openTasks: openTasks.length,
        overdueTasks: overdue.length,
        activeCampaigns: activeCamps.length,
        totalCampaigns: storeCampaigns.length,
        needsAttention: overdue.length > 0 || (openTasks.length === 0 && activeCamps.length === 0)
      };
    });

    // العناصر الحرجة (Action Center)
    const criticalItems: any[] = [];

    // مهام متأخرة
    overdueTasks.slice(0, 3).forEach(task => {
      const store = stores.find(s => s.id === task.store_id);
      const user = users.find(u => u.id === task.assigned_to);
      criticalItems.push({
        type: 'overdue_task',
        title: task.title,
        description: `مهمة متأخرة - ${store?.store_url || 'غير محدد'}`,
        assignee: user?.name,
        link: `/admin/tasks`,
        priority: 'high'
      });
    });

    // موظفين عليهم مهام متأخرة كثيرة
    lowPerformers.filter(u => u.overdueTasks >= 3).slice(0, 2).forEach(user => {
      criticalItems.push({
        type: 'employee_overdue',
        title: `${user.name} - ${user.overdueTasks} مهام متأخرة`,
        description: 'يحتاج إعادة توزيع المهام',
        link: `/admin/users/${user.id}`,
        priority: 'medium'
      });
    });

    // تعاميم عاجلة
    const urgentAnnouncements = announcements.filter(a => a.type === 'urgent' && a.status === 'sent');
    urgentAnnouncements.slice(0, 2).forEach(ann => {
      criticalItems.push({
        type: 'urgent_announcement',
        title: ann.title,
        description: 'تعميم عاجل',
        link: `/admin/announcements`,
        priority: 'high'
      });
    });

    // متاجر بحاجة متابعة
    storePerformance.filter(s => s.needsAttention).slice(0, 2).forEach(store => {
      criticalItems.push({
        type: 'store_attention',
        title: store.store_url,
        description: store.overdueTasks > 0 
          ? `${store.overdueTasks} مهام متأخرة`
          : 'بدون مهام أو حملات نشطة',
        link: `/admin/stores/${store.id}`,
        priority: 'medium'
      });
    });

    // التوصيات الذكية
    const smartInsights: any[] = [];

    // متاجر بدون مهام لأكثر من 7 أيام
    storePerformance.filter(s => s.openTasks === 0 && s.is_active).forEach(store => {
      smartInsights.push({
        type: 'inactive_store',
        icon: '🏪',
        message: `متجر "${store.store_url}" بدون مهام مفتوحة`,
        action: 'إضافة مهام جديدة',
        link: `/admin/stores/${store.id}`
      });
    });

    // موظفين بمهام متأخرة
    lowPerformers.filter(u => u.overdueTasks >= 3).forEach(user => {
      smartInsights.push({
        type: 'overloaded_employee',
        icon: '👤',
        message: `${user.name} لديه ${user.overdueTasks} مهام متأخرة`,
        action: 'إعادة توزيع المهام',
        link: `/admin/users/${user.id}`
      });
    });

    // مهام اليوم
    const todayTasksList = [...todayTasks, ...overdueTasks.slice(0, 5)]
      .slice(0, 8)
      .map(task => {
        const store = stores.find(s => s.id === task.store_id);
        const user = users.find(u => u.id === task.assigned_to);
        return {
          id: task.id,
          title: task.title,
          store: store?.store_url || 'غير محدد',
          assignee: user?.name || 'غير مكلف',
          status: task.status,
          isOverdue: task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed',
          dueDate: task.due_date
        };
      });

    // آخر التعاميم
    const recentAnnouncements = announcements
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(ann => ({
        id: ann.id,
        title: ann.title,
        type: ann.type,
        status: ann.status,
        createdAt: ann.created_at
      }));

    return NextResponse.json({
      kpis: {
        overdueTasks: overdueTasks.length,
        todayTasks: todayTasks.length,
        completedThisWeek: completedThisWeek.length,
        activeStores: activeStores.length,
        totalStores: stores.length,
        activeCampaigns: activeCampaigns.length,
        dailySpend: 0, // يحتاج ربط مع Snapchat API
        monthlySpend: 0,
        averageRoas: 0,
        unreadAnnouncements: unreadAnnouncements.length
      },
      criticalItems: criticalItems.slice(0, 6),
      storePerformance: storePerformance.sort((a, b) => b.overdueTasks - a.overdueTasks),
      topPerformers,
      lowPerformers,
      todayTasks: todayTasksList,
      recentAnnouncements,
      smartInsights: smartInsights.slice(0, 5),
      campaignStats: {
        totalActive: activeCampaigns.length,
        dailySpend: 0,
        bestCampaign: null,
        worstCampaign: null,
        noConversions: []
      }
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
