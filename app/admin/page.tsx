'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StoreStats, StoreWithProgress } from '@/types';
import Modal from '@/components/ui/Modal';
import AdminAuth from '@/components/AdminAuth';
import AddStoreModal from '@/components/AddStoreModal';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeletons';
import DashboardKPIBar from '@/components/dashboard/DashboardKPIBar';
import DashboardActionCenter from '@/components/dashboard/DashboardActionCenter';
import StorePerformanceWidget from '@/components/dashboard/StorePerformanceWidget';
import TeamPerformanceWidget from '@/components/dashboard/TeamPerformanceWidget';
import MarketingPulseWidget from '@/components/dashboard/MarketingPulseWidget';
import TodayTasksWidget from '@/components/dashboard/TodayTasksWidget';
import AnnouncementsWidget from '@/components/dashboard/AnnouncementsWidget';
import SmartInsightsWidget from '@/components/dashboard/SmartInsightsWidget';

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
  insights: Array<{ id: string; type: string; title: string; description: string; action: string | null; link: string | null }>;
  last_updated: string;
}

const REFRESH_INTERVAL = 5000; // تحديث كل 5 ثواني

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
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [stores, setStores] = useState<StoreWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingStore, setDeletingStore] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [storeMetadata, setStoreMetadata] = useState<Record<string, { name: string; logo: string | null }>>({});
  
  // Dashboard Summary State
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  
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
      console.error('Failed to fetch dashboard summary:', err);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // تحديث تلقائي للبيانات
  useEffect(() => {
    fetchData();
    fetchDashboardSummary();
    
    // إعداد التحديث التلقائي
    const interval = setInterval(() => {
      fetchDataSilent();
      fetchDashboardSummary();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // جلب بيانات المتجر (الاسم والشعار)
  const fetchStoreMetadata = async (storeUrl: string) => {
    try {
      const response = await fetch(`/api/store/metadata?url=${encodeURIComponent(storeUrl)}`);
      const data = await response.json();
      return {
        name: data.name || storeUrl.split('.')[0],
        logo: data.logo || data.favicon || null
      };
    } catch {
      return {
        name: storeUrl.split('.')[0],
        logo: null
      };
    }
  };

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

      // جلب بيانات المتاجر الجديدة
      const newStores = storesData.stores || [];
      for (const store of newStores) {
        if (!storeMetadata[store.store_url]) {
          const metadata = await fetchStoreMetadata(store.store_url);
          setStoreMetadata(prev => ({ ...prev, [store.store_url]: metadata }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    }
  }, [storeMetadata]);

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
      console.error('Failed to delete store:', err);
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

      console.log('ًں“ٹ Stats:', statsData);
      console.log('ًں“¦ Stores:', storesData);

      setStats(statsData);
      setStores(storesData.stores || []);
      setLoading(false);

      // جلب بيانات المتاجر (الاسم والشعار)
      const newStores = storesData.stores || [];
      for (const store of newStores) {
        const metadata = await fetchStoreMetadata(store.store_url);
        setStoreMetadata(prev => ({ ...prev, [store.store_url]: metadata }));
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
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
      console.error('Logout failed:', err);
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
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-purple-400 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-fuchsia-500 border-l-fuchsia-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-4 flex items-center justify-center">
              <img 
                src="/logo.png" 
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
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl bottom-0 right-1/3 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src="/logo.png" alt="Logo" className="w-14 h-14 sm:w-20 sm:h-20 object-contain" />
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
            {/* KPI Bar - شريط المؤشرات العلوي */}
            {dashboardData?.kpis && (
              <DashboardKPIBar kpis={dashboardData.kpis} />
            )}

            {/* Action Center - يحتاج تدخل الآن */}
            {dashboardData?.action_center && (
              <DashboardActionCenter items={dashboardData.action_center} />
            )}

            {/* Store Performance Widget - Full Width */}
            {dashboardData?.top_stores && (
              <StorePerformanceWidget stores={dashboardData.top_stores} />
            )}

            {/* Team Performance Widget - Full Width */}
            {dashboardData?.team && (
              <TeamPerformanceWidget team={dashboardData.team} />
            )}

            {/* Marketing Pulse Widget - Full Width */}
            {dashboardData?.campaigns_pulse && (
              <MarketingPulseWidget data={dashboardData.campaigns_pulse} />
            )}

            {/* Main Grid - 2 columns on desktop, 1 on mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today Tasks Widget */}
              {dashboardData?.today_tasks && (
                <TodayTasksWidget tasks={dashboardData.today_tasks} />
              )}

              {/* Announcements Widget */}
              {dashboardData?.announcements && (
                <AnnouncementsWidget announcements={dashboardData.announcements} canSendAnnouncement={true} />
              )}
            </div>

            {/* Smart Insights Widget - Full Width */}
            {dashboardData?.insights && (
              <SmartInsightsWidget insights={dashboardData.insights} onRefresh={fetchDashboardSummary} />
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-purple-500/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-purple-300/60">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Jud" className="w-6 h-6 object-contain opacity-60" />
              <span>© {new Date().getFullYear()} Jud Agency. جميع الحقوق محفوظة.</span>
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

// تصدير الصفحة مع حماية تسجيل الدخول
export default function AdminPage() {
  return (
    <AdminAuth>
      <AdminPageContent />
    </AdminAuth>
  );
}

