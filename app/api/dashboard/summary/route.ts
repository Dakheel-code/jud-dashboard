import { NextResponse } from 'next/server';

// Mock Data للـ Dashboard Summary
export async function GET() {
  // بيانات Mock ثابتة للاختبار
  const mockData = {
    kpis: {
      overdue_tasks: { value: 12, trend: 'up', change: 3 },
      due_today: { value: 8, trend: 'down', change: -2 },
      completed_this_week: { value: 45, trend: 'up', change: 12 },
      active_stores: { value: 24, trend: 'stable', change: 0 },
      active_campaigns: { value: 15, trend: 'up', change: 2 },
      total_spend_today: { value: 12500, trend: 'up', change: 1500 },
      average_roas: { value: 3.2, trend: 'down', change: -0.3 },
      unread_announcements: { value: 5, trend: 'up', change: 2 }
    },
    action_center: [
      {
        id: '1',
        type: 'overdue_task',
        title: 'مهمة متأخرة 3 أيام',
        description: 'تحديث صور المنتجات - متجر الأناقة',
        priority: 'high',
        link: '/admin/tasks?filter=overdue'
      },
      {
        id: '2',
        type: 'low_roas',
        title: 'حملة بأداء منخفض',
        description: 'حملة الصيف - ROAS 0.8',
        priority: 'high',
        link: '/admin/campaigns'
      },
      {
        id: '3',
        type: 'no_conversion',
        title: 'حملة بدون تحويلات',
        description: 'حملة المنتجات الجديدة - 48 ساعة',
        priority: 'medium',
        link: '/admin/campaigns'
      },
      {
        id: '4',
        type: 'pending_approval',
        title: 'طلب موافقة معلق',
        description: 'إضافة متجر جديد - انتظار 2 يوم',
        priority: 'medium',
        link: '/admin/stores'
      },
      {
        id: '5',
        type: 'urgent_announcement',
        title: 'تعميم عاجل غير مقروء',
        description: 'تحديث سياسة الإعلانات',
        priority: 'high',
        link: '/admin/announcements'
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
    insights: [
      {
        id: '1',
        type: 'warning',
        title: 'انخفاض في أداء الحملات',
        description: 'متوسط ROAS انخفض 15% مقارنة بالأسبوع الماضي',
        action: 'مراجعة الحملات',
        link: '/admin/campaigns'
      },
      {
        id: '2',
        type: 'success',
        title: 'تحسن في إنجاز المهام',
        description: 'معدل الإنجاز ارتفع 20% هذا الأسبوع',
        action: null,
        link: null
      },
      {
        id: '3',
        type: 'info',
        title: '3 متاجر بدون نشاط',
        description: 'لم يتم تحديث أي مهام منذ 7 أيام',
        action: 'عرض المتاجر',
        link: '/admin/stores?filter=inactive'
      },
      {
        id: '4',
        type: 'warning',
        title: 'حملات بميزانية منخفضة',
        description: '5 حملات ستنتهي ميزانيتها خلال 24 ساعة',
        action: 'مراجعة الميزانيات',
        link: '/admin/campaigns'
      }
    ],
    last_updated: new Date().toISOString()
  };

  return NextResponse.json(mockData);
}
