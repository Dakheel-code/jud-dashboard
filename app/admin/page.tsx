'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StoreStats, StoreWithProgress } from '@/types';
import Modal from '@/components/ui/Modal';
import AdminAuth from '@/components/AdminAuth';
import AddStoreModal from '@/components/AddStoreModal';

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
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalType, setResultModalType] = useState<'success' | 'error'>('success');
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [storeToDelete, setStoreToDelete] = useState<{ id: string; url: string } | null>(null);
  
  // Add Store Modal states
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreWithProgress | null>(null);

  // تحديث تلقائي للبيانات
  useEffect(() => {
    fetchData();
    
    // إعداد التحديث التلقائي
    const interval = setInterval(() => {
      fetchDataSilent();
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
          <div>
            <h1 className="text-2xl sm:text-3xl mb-1">
              <span className="text-white font-semibold">لوحة </span>
              <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent font-black">الإدارة</span>
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

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-purple-900/30 p-4 sm:p-6 border border-purple-500/20">
              <h3 className="text-xs sm:text-sm font-medium text-purple-300/80 mb-1 sm:mb-2">
                عدد المتاجر
              </h3>
              <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {stats.total_stores}
              </p>
            </div>

            <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-purple-900/30 p-4 sm:p-6 border border-purple-500/20">
              <h3 className="text-xs sm:text-sm font-medium text-purple-300/80 mb-1 sm:mb-2">
                متوسط الإنجاز
              </h3>
              <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                {stats.average_completion}%
              </p>
            </div>

            <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-purple-900/30 p-4 sm:p-6 border border-purple-500/20">
              <h3 className="text-xs sm:text-sm font-medium text-purple-300/80 mb-1 sm:mb-2">
                أكثر مدير إنجازاً
              </h3>
              {stats.top_account_manager?.id ? (
                <Link href={`/admin/users/${stats.top_account_manager.id}`} className="text-sm sm:text-lg font-semibold text-white hover:text-fuchsia-400 transition-colors line-clamp-1">
                  {stats.top_account_manager.name}
                </Link>
              ) : (
                <p className="text-sm sm:text-lg font-semibold text-white">-</p>
              )}
            </div>

            <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-purple-900/30 p-4 sm:p-6 border border-purple-500/20">
              <h3 className="text-xs sm:text-sm font-medium text-purple-300/80 mb-1 sm:mb-2">
                أقل مدير إنجازاً
              </h3>
              {stats.lowest_account_manager?.id ? (
                <Link href={`/admin/users/${stats.lowest_account_manager.id}`} className="text-sm sm:text-lg font-semibold text-white hover:text-fuchsia-400 transition-colors line-clamp-1">
                  {stats.lowest_account_manager.name}
                </Link>
              ) : (
                <p className="text-sm sm:text-lg font-semibold text-white">-</p>
              )}
            </div>
          </div>
        )}

        {/* Top 10 Stores */}
        {stores.length > 0 && (
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-purple-900/30 p-4 sm:p-6 border border-purple-500/20 mb-6 sm:mb-8">
            <h2 className="text-xl text-white mb-4 flex items-center gap-2" style={{ fontFamily: "'Suisse Intl', var(--font-cairo), sans-serif", fontWeight: 600 }}>
              <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              أفضل المتاجر إنجازاً
            </h2>
            <div className="space-y-3">
              {[...stores]
                .sort((a, b) => b.completion_percentage - a.completion_percentage)
                .slice(0, 10)
                .map((store, index) => (
                  <div key={store.id} className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-xl bg-purple-900/20 hover:bg-purple-900/30 transition-colors">
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0 ${
                      index === 0 ? 'bg-yellow-500 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-amber-600 text-amber-100' :
                      'bg-purple-700 text-purple-200'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {storeMetadata[store.store_url]?.logo ? (
                        <img 
                          src={storeMetadata[store.store_url].logo!}
                          alt={storeMetadata[store.store_url]?.name}
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded object-cover flex-shrink-0"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : null}
                      <a 
                        href={`https://${store.store_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm sm:text-base text-white font-medium hover:text-fuchsia-400 transition-colors truncate"
                      >
                        {storeMetadata[store.store_url]?.name || store.store_url}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="hidden sm:block w-24 bg-purple-950/50 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                            index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' :
                            index === 2 ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                            'bg-gradient-to-r from-purple-500 to-fuchsia-500'
                          }`}
                          style={{ width: `${store.completion_percentage}%` }}
                        />
                      </div>
                      <span className={`text-xs sm:text-sm font-bold w-10 sm:w-12 text-left ${
                        index === 0 ? 'text-yellow-400' :
                        index === 1 ? 'text-gray-300' :
                        index === 2 ? 'text-amber-500' :
                        'text-purple-300'
                      }`}>
                        {store.completion_percentage}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="bg-purple-950/40 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-900/30 overflow-hidden border border-purple-500/20">
          <div className="px-4 sm:px-6 py-4 border-b border-purple-500/20">
            <h2 className="text-xl sm:text-2xl text-white" style={{ fontFamily: "'Suisse Intl', var(--font-cairo), sans-serif", fontWeight: 600 }}>جميع المتاجر</h2>
          </div>

          {/* Mobile View - Cards */}
          <div className="block lg:hidden divide-y divide-purple-500/20">
            {stores.map((store) => (
              <div key={store.id} className="p-4 hover:bg-purple-900/20 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    {storeMetadata[store.store_url]?.logo ? (
                      <img 
                        src={storeMetadata[store.store_url].logo!}
                        alt={storeMetadata[store.store_url]?.name}
                        className="w-8 h-8 rounded object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : null}
                    <div>
                      <a 
                        href={`https://${store.store_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white font-medium text-sm hover:text-fuchsia-400 transition-colors"
                      >
                        {storeMetadata[store.store_url]?.name || store.store_url}
                      </a>
                      <p className="text-purple-400/60 text-xs mt-1">
                        {new Date(store.created_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                  <span className="text-purple-300 text-sm">
                    {store.completed_tasks}/{store.total_tasks}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 bg-purple-950/50 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-fuchsia-500 h-2 rounded-full"
                      style={{ width: `${store.completion_percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-purple-200 w-12 text-left">
                    {store.completion_percentage}%
                  </span>
                </div>
                <div className="flex gap-2 justify-end">
                  <Link
                    href={`/admin/store/${encodeURIComponent(store.store_url)}`}
                    className="p-2 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-lg transition-all"
                    title="عرض التفاصيل"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </Link>
                  <button
                    onClick={() => openDeleteModal(store.id, store.store_url)}
                    disabled={deletingStore === store.id}
                    className="p-2 text-red-400 border border-red-500/30 hover:border-red-400/50 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                    title="حذف"
                  >
                    {deletingStore === store.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View - Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-purple-900/30">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-purple-300 uppercase tracking-wider">
                    رابط المتجر
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-purple-300 uppercase tracking-wider">
                    مدير الحساب
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-purple-300 uppercase tracking-wider">
                    نسبة الإنجاز
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-purple-300 uppercase tracking-wider">
                    تاريخ الإنشاء
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-purple-300 uppercase tracking-wider">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/20">
                {stores.map((store) => (
                  <tr key={store.id} className="hover:bg-purple-900/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {storeMetadata[store.store_url]?.logo ? (
                          <img 
                            src={storeMetadata[store.store_url].logo!}
                            alt={storeMetadata[store.store_url]?.name}
                            className="w-6 h-6 rounded object-cover"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : null}
                        <Link
                          href={`/admin/store/${encodeURIComponent(store.store_url)}`}
                          className="text-white hover:text-fuchsia-400 transition-colors"
                        >
                          {storeMetadata[store.store_url]?.name || store.store_url}
                        </Link>
                        <a 
                          href={`https://${store.store_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400/50 hover:text-purple-300 transition-colors"
                          title="فتح المتجر"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {store.account_manager_id ? (
                        <Link
                          href={`/admin/users/${store.account_manager_id}`}
                          className="text-purple-300 hover:text-fuchsia-400 transition-colors"
                        >
                          {store.account_manager_name ? store.account_manager_name.split(' ')[0] : '-'}
                        </Link>
                      ) : (
                        <span className="text-purple-300/50">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-purple-950/50 rounded-full h-2 max-w-[100px]">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-fuchsia-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${store.completion_percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-purple-200">
                          {store.completion_percentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-300">
                      {getTimeAgo(store.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/store/${encodeURIComponent(store.store_url)}`}
                          className="p-2 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-lg transition-all"
                          title="عرض التفاصيل"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => openEditStoreModal(store)}
                          className="p-2 text-blue-400 border border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-500/10 rounded-lg transition-all"
                          title="تعديل"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteModal(store.id, store.store_url)}
                          disabled={deletingStore === store.id}
                          className="p-2 text-red-400 border border-red-500/30 hover:border-red-400/50 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                          title="حذف المتجر"
                        >
                          {deletingStore === store.id ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {stores.length === 0 && (
            <div className="text-center py-12 text-purple-300/60">
              لا توجد متاجر بعد
            </div>
          )}
        </div>

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

        {/* Floating Add Store Button */}
        <button
          onClick={openAddStoreModal}
          className="fixed bottom-24 left-6 lg:bottom-8 lg:left-8 w-14 h-14 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white rounded-full shadow-lg shadow-purple-500/50 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 z-40"
          title="إضافة متجر جديد"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

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

