import { NextResponse } from 'next/server';

// Mock Data للـ Dashboard Summary
export async function GET() {
  // بيانات Mock ثابتة للاختبار
  const mockData = {
    kpis: {
      total_managers: { value: 10, trend: 'up', change: 2 },
      avg_completion_rate: { value: 78, trend: 'up', change: 5 },
      top_performers: { value: 5, trend: 'up', change: 1 },
      needs_attention: { value: 3, trend: 'down', change: -1 },
      active_stores: { value: 42, trend: 'up', change: 4 },
      unassigned_stores: { value: 6, trend: 'down', change: -2 },
      tasks_completed_week: { value: 156, trend: 'up', change: 23 },
      overdue_tasks: { value: 12, trend: 'down', change: -3 }
    },
    action_center: [
      {
        id: '1',
        type: 'low_performance',
        title: 'مدير بأداء منخفض',
        description: 'خالد عبدالله - نسبة إنجاز 35% فقط',
        priority: 'high',
        link: '/admin/team?filter=low'
      },
      {
        id: '2',
        type: 'unassigned_stores',
        title: '6 متاجر بدون مدير',
        description: 'متاجر جديدة تحتاج إسناد لمدراء العلاقات',
        priority: 'high',
        link: '/admin/stores?filter=unassigned'
      },
      {
        id: '3',
        type: 'overload',
        title: 'توزيع غير متوازن',
        description: 'أحمد محمد لديه 8 متاجر - يحتاج إعادة توزيع',
        priority: 'medium',
        link: '/admin/team'
      },
      {
        id: '4',
        type: 'overdue_tasks',
        title: '12 مهمة متأخرة',
        description: 'مهام متأخرة تحتاج متابعة من المدراء',
        priority: 'high',
        link: '/admin/tasks?filter=overdue'
      },
      {
        id: '5',
        type: 'inactive_manager',
        title: 'مدير غير نشط',
        description: 'سلطان فهد - لم ينجز أي مهمة منذ 3 أيام',
        priority: 'medium',
        link: '/admin/team'
      }
    ],
    top_stores: [
      { id: '1', name: 'متجر الأناقة', url: 'elegance.sa', completion: 95, tasks_done: 38, tasks_total: 40, trend: 'up', open_tasks: 2, active_campaigns: 5, spend_today: 3500, roas: 4.2, status: 'active' },
      { id: '2', name: 'متجر التقنية', url: 'tech-store.sa', completion: 88, tasks_done: 35, tasks_total: 40, trend: 'up', open_tasks: 5, active_campaigns: 3, spend_today: 2800, roas: 3.8, status: 'active' },
      { id: '3', name: 'متجر الرياضة', url: 'sport-shop.sa', completion: 82, tasks_done: 33, tasks_total: 40, trend: 'stable', open_tasks: 7, active_campaigns: 4, spend_today: 1500, roas: 2.5, status: 'active' },
      { id: '4', name: 'متجر الجمال', url: 'beauty.sa', completion: 75, tasks_done: 30, tasks_total: 40, trend: 'down', open_tasks: 10, active_campaigns: 2, spend_today: 800, roas: 1.2, status: 'needs_attention' },
      { id: '5', name: 'متجر المنزل', url: 'home-store.sa', completion: 70, tasks_done: 28, tasks_total: 40, trend: 'up', open_tasks: 12, active_campaigns: 1, spend_today: 500, roas: 0.8, status: 'needs_attention' },
      { id: '6', name: 'متجر الإلكترونيات', url: 'electronics.sa', completion: 92, tasks_done: 37, tasks_total: 40, trend: 'up', open_tasks: 3, active_campaigns: 6, spend_today: 4200, roas: 5.1, status: 'active' },
      { id: '7', name: 'متجر الأطفال', url: 'kids-store.sa', completion: 65, tasks_done: 26, tasks_total: 40, trend: 'down', open_tasks: 14, active_campaigns: 0, spend_today: 0, roas: 0, status: 'needs_attention' },
      { id: '8', name: 'متجر الأزياء', url: 'fashion.sa', completion: 78, tasks_done: 31, tasks_total: 40, trend: 'stable', open_tasks: 9, active_campaigns: 2, spend_today: 1200, roas: 2.1, status: 'active' }
    ],
    team: {
      top_performers: [
        { id: '1', name: 'أحمد محمد', avatar: null, tasks_completed: 25, completion_rate: 95 },
        { id: '2', name: 'سارة علي', avatar: null, tasks_completed: 22, completion_rate: 92 },
        { id: '3', name: 'محمد خالد', avatar: null, tasks_completed: 20, completion_rate: 88 },
        { id: '4', name: 'فاطمة أحمد', avatar: null, tasks_completed: 18, completion_rate: 85 },
        { id: '5', name: 'عمر حسن', avatar: null, tasks_completed: 16, completion_rate: 82 }
      ],
      low_performers: [
        { id: '6', name: 'خالد عبدالله', avatar: null, tasks_completed: 5, completion_rate: 35, overdue_tasks: 8 },
        { id: '7', name: 'نورة سعد', avatar: null, tasks_completed: 7, completion_rate: 42, overdue_tasks: 6 },
        { id: '8', name: 'يوسف محمد', avatar: null, tasks_completed: 8, completion_rate: 48, overdue_tasks: 5 },
        { id: '9', name: 'ريم عبدالرحمن', avatar: null, tasks_completed: 9, completion_rate: 52, overdue_tasks: 4 },
        { id: '10', name: 'سلطان فهد', avatar: null, tasks_completed: 10, completion_rate: 55, overdue_tasks: 3 }
      ]
    },
    campaigns_pulse: {
      total_spend_today: 12500,
      total_spend_week: 87500,
      average_roas: 3.2,
      best_campaign: {
        id: '1',
        name: 'حملة رمضان',
        spend: 3500,
        roas: 5.8,
        conversions: 45
      },
      worst_campaign: {
        id: '2',
        name: 'حملة الصيف',
        spend: 2800,
        roas: 0.8,
        conversions: 3
      },
      campaigns_without_conversions: 3
    },
    today_tasks: [
      { id: '1', title: 'تحديث صور المنتجات', store: 'متجر الأناقة', due: 'اليوم 2:00 م', status: 'pending', priority: 'high' },
      { id: '2', title: 'مراجعة الحملة الإعلانية', store: 'متجر التقنية', due: 'اليوم 4:00 م', status: 'pending', priority: 'medium' },
      { id: '3', title: 'إضافة منتجات جديدة', store: 'متجر الرياضة', due: 'متأخر يومين', status: 'overdue', priority: 'high' },
      { id: '4', title: 'تحسين وصف المنتجات', store: 'متجر الجمال', due: 'اليوم 6:00 م', status: 'pending', priority: 'low' },
      { id: '5', title: 'تحديث الأسعار', store: 'متجر المنزل', due: 'متأخر 3 أيام', status: 'overdue', priority: 'high' },
      { id: '6', title: 'إعداد تقرير الأداء', store: 'متجر الأناقة', due: 'اليوم 8:00 م', status: 'in_progress', priority: 'medium' }
    ],
    announcements: [
      { id: '1', title: 'تحديث سياسة الإعلانات', type: 'urgent', created_at: '2025-01-22T01:00:00Z', is_read: false },
      { id: '2', title: 'إجازة نهاية الأسبوع', type: 'normal', created_at: '2025-01-21T10:00:00Z', is_read: true },
      { id: '3', title: 'تدريب جديد متاح', type: 'normal', created_at: '2025-01-20T14:00:00Z', is_read: false },
      { id: '4', title: 'تحديث النظام القادم', type: 'scheduled', created_at: '2025-01-19T09:00:00Z', is_read: true },
      { id: '5', title: 'مكافآت الشهر', type: 'normal', created_at: '2025-01-18T16:00:00Z', is_read: false }
    ],
    account_managers: {
      best_manager: { id: '1', name: 'أحمد محمد', avatar: null, stores_count: 8, completion_rate: 95, tasks_completed: 45, total_tasks: 47 },
      worst_manager: { id: '6', name: 'خالد عبدالله', avatar: null, stores_count: 3, completion_rate: 35, tasks_completed: 12, total_tasks: 34 },
      overall_completion_rate: 78,
      total_managers: 10,
      total_stores_assigned: 42,
      unassigned_stores: 6,
      top_10: [
        { id: '1', name: 'أحمد محمد', avatar: null, stores_count: 8, completion_rate: 95 },
        { id: '2', name: 'سارة علي', avatar: null, stores_count: 7, completion_rate: 92 },
        { id: '3', name: 'محمد خالد', avatar: null, stores_count: 6, completion_rate: 88 },
        { id: '4', name: 'فاطمة أحمد', avatar: null, stores_count: 5, completion_rate: 85 },
        { id: '5', name: 'عمر حسن', avatar: null, stores_count: 5, completion_rate: 82 },
        { id: '6', name: 'نورة سعد', avatar: null, stores_count: 4, completion_rate: 75 },
        { id: '7', name: 'يوسف محمد', avatar: null, stores_count: 3, completion_rate: 68 },
        { id: '8', name: 'ريم عبدالرحمن', avatar: null, stores_count: 2, completion_rate: 62 },
        { id: '9', name: 'سلطان فهد', avatar: null, stores_count: 1, completion_rate: 55 },
        { id: '10', name: 'خالد عبدالله', avatar: null, stores_count: 1, completion_rate: 35 }
      ],
      most_assigned: { id: '1', name: 'أحمد محمد', avatar: null, stores_count: 8 },
      least_assigned: { id: '10', name: 'خالد عبدالله', avatar: null, stores_count: 1 }
    },
    insights: [
      {
        id: '1',
        type: 'warning',
        title: '3 مدراء بأداء منخفض',
        description: 'نسبة إنجازهم أقل من 50% هذا الأسبوع',
        action: 'عرض المدراء',
        link: '/admin/team?filter=low'
      },
      {
        id: '2',
        type: 'success',
        title: 'تحسن في أداء الفريق',
        description: 'متوسط الإنجاز ارتفع 5% مقارنة بالأسبوع الماضي',
        action: null,
        link: null
      },
      {
        id: '3',
        type: 'info',
        title: '6 متاجر بدون مدير علاقة',
        description: 'يجب إسناد هذه المتاجر لمدراء العلاقات',
        action: 'إسناد المتاجر',
        link: '/admin/stores?filter=unassigned'
      },
      {
        id: '4',
        type: 'warning',
        title: 'توزيع غير متوازن',
        description: 'أحمد محمد لديه 8 متاجر بينما خالد لديه 1 فقط',
        action: 'إعادة التوزيع',
        link: '/admin/team'
      }
    ],
    last_updated: new Date().toISOString()
  };

  return NextResponse.json(mockData);
}
