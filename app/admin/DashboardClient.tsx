'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { StoreStats, StoreWithProgress } from '@/types';
import Modal from '@/components/ui/Modal';
import { useBranding } from '@/contexts/BrandingContext';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeletons';

const AddStoreModal = dynamic(() => import('@/components/AddStoreModal'), { ssr: false });
const DashboardKPIBar = dynamic(() => import('@/components/dashboard/DashboardKPIBar'), { ssr: false });
const DashboardActionCenter = dynamic(() => import('@/components/dashboard/DashboardActionCenter'), { ssr: false });
const StorePerformanceWidget = dynamic(() => import('@/components/dashboard/StorePerformanceWidget'), { ssr: false });
const TeamPerformanceWidget = dynamic(() => import('@/components/dashboard/TeamPerformanceWidget'), { ssr: false });
const MarketingPulseWidget = dynamic(() => import('@/components/dashboard/MarketingPulseWidget'), { ssr: false });
const TodayTasksWidget = dynamic(() => import('@/components/dashboard/TodayTasksWidget'), { ssr: false });
const AnnouncementsWidget = dynamic(() => import('@/components/dashboard/AnnouncementsWidget'), { ssr: false });
const SmartInsightsWidget = dynamic(() => import('@/components/dashboard/SmartInsightsWidget'), { ssr: false });
const AccountManagersWidget = dynamic(() => import('@/components/dashboard/AccountManagersWidget'), { ssr: false });
const ManagersChartsWidget = dynamic(() => import('@/components/dashboard/ManagersChartsWidget'), { ssr: false });

// Dashboard Summary Types
interface DashboardSummary {
  kpis: Record<string, { value: number; trend: string; change: number }>;
  action_center: Array<{ id: string; type: string; title: string; description: string; priority: string; link: string }>;
  top_stores: Array<{ id: string; name: string; url: string; completion: number; tasks_done: number; tasks_total: number; trend: string }>;
  team: {
    top_performers: Array<{ id: string; name: string; avatar: string | null; tasks_completed: number; completion_rate: number }>;
    low_performers: Array<{ id: string; name: string; avatar: string | null; tasks_completed: number; completion_rate: number; overdue_tasks: number }>;
  };
  campaigns_pulse: {
    total_spend_today: number;
    total_spend_week: number;
    average_roas: number;
    best_campaign: { id: string; name: string; spend: number; roas: number; conversions: number } | null;
    worst_campaign: { id: string; name: string; spend: number; roas: number; conversions: number } | null;
    campaigns_without_conversions: number;
  };
  today_tasks: Array<{ id: string; title: string; store: string; due: string; status: string; priority: string }>;
  announcements: Array<{ id: string; title: string; type: string; created_at: string; is_read: boolean }>;
  account_managers: {
    best_manager: { id: string; name: string; avatar: string | null; stores_count: number; completion_rate: number; tasks_completed: number; total_tasks: number };
    worst_manager: { id: string; name: string; avatar: string | null; stores_count: number; completion_rate: number; tasks_completed: number; total_tasks: number };
    overall_completion_rate: number;
    total_managers: number;
    total_stores_assigned: number;
    unassigned_stores: number;
    top_10: Array<{ id: string; name: string; avatar: string | null; stores_count: number; completion_rate: number }>;
    most_assigned: { id: string; name: string; avatar: string | null; stores_count: number };
    least_assigned: { id: string; name: string; avatar: string | null; stores_count: number };
  };
  insights: Array<{ id: string; type: string; title: string; description: string; action: string | null; link: string | null }>;
  last_updated: string;
}

const REFRESH_INTERVAL = 60000; // تحديث كل 60 ثانية

// دالة لحساب الوقت النسبي
const getTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'منذ لحظات';
  if (diffInSeconds < 3600) return `منذ ${Math.floor(diffInSeconds / 60)} دقيقة`;
  if (diffInSeconds < 86400) return `منذ ${Math.floor(diffInSeconds / 3600)} ساعة`;
  if (diffInSeconds < 604800) return `منذ ${Math.floor(diffInSeconds / 86400)} يوم`;
  if (diffInSeconds < 2592000) return `منذ ${Math.floor(diffInSeconds / 604800)} أسبوع`;
  if (diffInSeconds < 31536000) return `منذ ${Math.floor(diffInSeconds / 2592000)} شهر`;
  return `منذ ${Math.floor(diffInSeconds / 31536000)} سنة`;
};

function AdminPageContent() {
  const router = useRouter();
  const { branding } = useBranding();
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [stores, setStores] = useState<StoreWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingStore, setDeletingStore] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Dashboard Summary State
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  
  // Dashboard Widgets Settings
  const [widgetSettings, setWidgetSettings] = useState<Record<string, { enabled: boolean; order: number; label: string }>>({
    kpi_bar: { enabled: true, order: 1, label: 'شريط المؤشرات' },
    action_center: { enabled: true, order: 2, label: 'يحتاج تدخل الآن' },
    store_performance: { enabled: true, order: 3, label: 'أداء المتاجر' },
    team_performance: { enabled: true, order: 4, label: 'أداء الفريق' },
    marketing_pulse: { enabled: true, order: 5, label: 'نبض التسويق' },
    account_managers: { enabled: true, order: 6, label: 'مدراء العلاقات' },
    managers_charts: { enabled: true, order: 7, label: 'تحليلات الأداء' },
    today_tasks: { enabled: true, order: 8, label: 'مهام اليوم' },
    announcements: { enabled: true, order: 9, label: 'الإعلانات' },
    smart_insights: { enabled: true, order: 10, label: 'الرؤى الذكية' },
  });
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalType, setResultModalType] = useState<'success' | 'error'>('success');
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [storeToDelete, setStoreToDelete] = useState<{ id: string; url: string } | null>(null);
  
  // Add Store Modal states
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreWithProgress | null>(null);

  // جلب بيانات Dashboard Summary
  const fetchDashboardSummary = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/summary', { cache: 'no-store' });
      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // جلب إعدادات الويدجتس
  const fetchWidgetSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/settings/dashboard', { cache: 'no-store' });
      const data = await response.json();
      if (data.settings?.widgets) {
        setWidgetSettings(data.settings.widgets);
      }
    } catch (err) {
    }
  }, []);

  // مزامنة بيانات المستخدم إلى localStorage عند الدخول بـ Google (للتوافق مع الصفحات القديمة)
  useEffect(() => {
    const syncUserToLocalStorage = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      // دالة مساعدة: دمج بيانات الـ session مع localStorage (يحافظ على name/avatar المحدّثة)
      const mergeAndStore = (sessionUser: any) => {
        const stored = localStorage.getItem('admin_user');
        const existing = stored ? JSON.parse(stored) : {};
        // الأولوية لـ localStorage في name/avatar/phone (قد تكون محدّثة من الملف الشخصي)
        const merged = {
          ...sessionUser,
          name:   existing.name   || sessionUser.name,
          avatar: existing.avatar || sessionUser.avatar,
          phone:  existing.phone  || sessionUser.phone,
        };
        localStorage.setItem('admin_user', JSON.stringify(merged));
        window.dispatchEvent(new Event('user-updated'));
      };

      if (urlParams.get('sync') === '1') {
        try {
          const response = await fetch('/api/me');
          if (response.ok) {
            const data = await response.json();
            if (data.user) mergeAndStore(data.user);
          }
          window.history.replaceState({}, '', '/admin');
        } catch (err) {
        }
      } else {
        const storedUser = localStorage.getItem('admin_user');
        if (!storedUser) {
          try {
            const response = await fetch('/api/me');
            if (response.ok) {
              const data = await response.json();
              if (data.user) mergeAndStore(data.user);
            }
          } catch (err) {
          }
        }
      }
    };
    syncUserToLocalStorage();
  }, []);

  // تحديث تلقائي للبيانات
  useEffect(() => {
    fetchData();
    fetchDashboardSummary();
    fetchWidgetSettings();
    
    // إعداد التحديث التلقائي
    const interval = setInterval(() => {
      fetchDataSilent();
      fetchDashboardSummary();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // جلب البيانات بدون إظهار حالة التحميل (للتحديث التلقائي)
  const fetchDataSilent = useCallback(async () => {
    try {
      const [statsRes, storesRes] = await Promise.all([
        fetch('/api/admin/stats', { cache: 'no-store' }),
        fetch('/api/admin/stores', { cache: 'no-store' }),
      ]);

      const statsData = await statsRes.json();
      const storesData = await storesRes.json();

      setStats(statsData);
      setStores(storesData.stores || []);
      setLastUpdate(new Date());

    } catch (err) {
    }
  }, []);

  const openDeleteModal = (storeId: string, storeUrl: string) => {
    setStoreToDelete({ id: storeId, url: storeUrl });
    setShowDeleteModal(true);
  };

  const handleDeleteStore = async () => {
    if (!storeToDelete) return;
    
    setShowDeleteModal(false);
    setDeletingStore(storeToDelete.id);
    
    try {
      const response = await fetch(`/api/admin/stores/${storeToDelete.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok || data.success || response.status === 404) {
        // إعادة جلب البيانات من الـ API لتحديث الإحصائيات بشكل صحيح
        await fetchData();
        
        setResultModalType('success');
        setResultModalMessage('تم حذف المتجر بنجاح!');
      } else {
        setResultModalType('error');
        setResultModalMessage(`فشل حذف المتجر: ${data.error || 'خطأ غير معروف'}`);
      }
    } catch (err) {
      setResultModalType('error');
      setResultModalMessage('حدث خطأ أثناء حذف المتجر.');
    } finally {
      setDeletingStore(null);
      setStoreToDelete(null);
      setShowResultModal(true);
    }
  };

  const fetchData = async () => {
    try {
      const [statsRes, storesRes] = await Promise.all([
        fetch('/api/admin/stats', { cache: 'no-store' }),
        fetch('/api/admin/stores', { cache: 'no-store' }),
      ]);

      const statsData = await statsRes.json();
      const storesData = await storesRes.json();

      setStats(statsData);
      setStores(storesData.stores || []);
      setLoading(false);

    } catch (err) {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      router.push('/admin/login');
    } catch (err) {
    }
  };

  // فتح نافذة إضافة متجر
  const openAddStoreModal = () => {
    setEditingStore(null);
    setShowAddStoreModal(true);
  };

  // فتح نافذة تعديل متجر
  const openEditStoreModal = (store: StoreWithProgress) => {
    setEditingStore(store);
    setShowAddStoreModal(true);
  };

  // عند نجاح إضافة/تعديل المتجر
  const handleStoreSuccess = () => {
    setResultModalType('success');
    setResultModalMessage(editingStore ? 'تم تحديث المتجر بنجاح!' : 'تم إضافة المتجر بنجاح!');
    setShowResultModal(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0118] relative overflow-hidden">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-purple-400 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-fuchsia-500 border-l-fuchsia-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-4 flex items-center justify-center">
              <img 
                src={branding.logo || '/logo.png'} 
                alt="Loading" 
                className="w-full h-full object-contain animate-pulse"
                style={{ filter: 'drop-shadow(0 0 15px rgba(167, 139, 250, 0.8)) drop-shadow(0 0 30px rgba(139, 92, 246, 0.6))' }}
              />
            </div>
          </div>
          <div className="text-xl text-white font-semibold">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0a0118]">

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src={branding.logo || '/logo.png'} alt={branding.companyName || 'Logo'} className="w-14 h-14 sm:w-20 sm:h-20 object-contain" />
            <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
            <div>
              <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>
                لوحة الإدارة
              </h1>
              <p className="text-purple-300/80 flex items-center gap-2 text-sm">
                إدارة ومتابعة جميع المتاجر
                <span className="inline-flex items-center gap-1 text-xs text-green-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  مباشر
                </span>
              </p>
            </div>
          </div>
          
          </div>

        {/* Dashboard Content with Skeleton Loading */}
        {dashboardLoading ? (
          <DashboardSkeleton />
        ) : (
          <div className="space-y-6">
            {/* Render widgets dynamically based on order */}
            {Object.entries(widgetSettings)
              .filter(([_, widget]) => widget.enabled)
              .sort((a, b) => a[1].order - b[1].order)
              .map(([key, widget]) => {
                switch (key) {
                  case 'kpi_bar':
                    return dashboardData?.kpis ? (
                      <DashboardKPIBar key={key} kpis={dashboardData.kpis} />
                    ) : null;
                  case 'action_center':
                    return dashboardData?.action_center ? (
                      <DashboardActionCenter key={key} items={dashboardData.action_center} />
                    ) : null;
                  case 'store_performance':
                    return dashboardData?.top_stores ? (
                      <StorePerformanceWidget key={key} stores={dashboardData.top_stores} />
                    ) : null;
                  case 'team_performance':
                    return dashboardData?.team ? (
                      <TeamPerformanceWidget key={key} team={dashboardData.team} />
                    ) : null;
                  case 'marketing_pulse':
                    return dashboardData?.campaigns_pulse ? (
                      <MarketingPulseWidget key={key} data={dashboardData.campaigns_pulse} />
                    ) : null;
                  case 'account_managers':
                    return dashboardData?.account_managers ? (
                      <AccountManagersWidget key={key} data={dashboardData.account_managers} />
                    ) : null;
                  case 'managers_charts':
                    return dashboardData?.account_managers ? (
                      <ManagersChartsWidget key={key} data={{
                        overall_completion_rate: dashboardData.account_managers.overall_completion_rate,
                        total_managers: dashboardData.account_managers.total_managers,
                        total_stores_assigned: dashboardData.account_managers.total_stores_assigned,
                        unassigned_stores: dashboardData.account_managers.unassigned_stores,
                        top_10: dashboardData.account_managers.top_10,
                      }} />
                    ) : null;
                  case 'today_tasks':
                    return dashboardData?.today_tasks ? (
                      <TodayTasksWidget key={key} tasks={dashboardData.today_tasks} />
                    ) : null;
                  case 'announcements':
                    return dashboardData?.announcements ? (
                      <AnnouncementsWidget key={key} announcements={dashboardData.announcements} canSendAnnouncement={true} />
                    ) : null;
                  case 'smart_insights':
                    return dashboardData?.insights ? (
                      <SmartInsightsWidget key={key} insights={dashboardData.insights} onRefresh={fetchDashboardSummary} />
                    ) : null;
                  default:
                    return null;
                }
              })}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-purple-500/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-purple-300/60">
            <div className="flex items-center gap-2">
              <img src={branding.logo || '/logo.png'} alt={branding.companyName || 'Logo'} className="w-8 h-8 object-contain opacity-60" />
              <span>© {new Date().getFullYear()} {branding.companyNameEn || 'zid'}. جميع الحقوق محفوظة.</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                النظام يعمل بشكل طبيعي
              </span>
              <span>v2.0</span>
            </div>
          </div>
        </footer>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteStore}
          title="تأكيد الحذف"
          message={`هل أنت متأكد من حذف متجر "${storeToDelete?.url}"؟\nسيتم حذف جميع بيانات المتجر بشكل نهائي.`}
          type="confirm"
          confirmText="حذف"
          cancelText="إلغاء"
        />

        {/* Result Modal */}
        <Modal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          title={resultModalType === 'success' ? 'نجاح' : 'خطأ'}
          message={resultModalMessage}
          type={resultModalType}
        />

        {/* Add Store Modal */}
        <AddStoreModal
          isOpen={showAddStoreModal}
          onClose={() => { setShowAddStoreModal(false); setEditingStore(null); }}
          onSuccess={handleStoreSuccess}
          editingStore={editingStore}
        />

      </div>
    </div>
  );
}

export default function DashboardClient() {
  return <AdminPageContent />;
}

