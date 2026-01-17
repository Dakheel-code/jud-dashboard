'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StoreStats, StoreWithProgress } from '@/types';

export default function AdminPage() {
  const [stats, setStats] = useState<StoreStats | null>(null);
  const [stores, setStores] = useState<StoreWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingStore, setDeletingStore] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteStore = async (storeId: string, storeUrl: string) => {
    if (!confirm(`هل أنت متأكد من حذف متجر "${storeUrl}"؟\nسيتم حذف جميع بيانات المتجر بشكل نهائي.`)) {
      return;
    }

    setDeletingStore(storeId);
    
    try {
      console.log('Deleting store:', storeId);
      const response = await fetch(`/api/admin/stores/${storeId}`, {
        method: 'DELETE'
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      // إزالة المتجر من القائمة في جميع الحالات (نجاح أو 404)
      if (response.ok || data.success || response.status === 404) {
        // إزالة المتجر من القائمة مباشرة
        setStores(prevStores => prevStores.filter(store => store.id !== storeId));
        
        // تحديث الإحصائيات
        if (stats) {
          setStats({
            ...stats,
            total_stores: Math.max(0, stats.total_stores - 1)
          });
        }
        
        alert('تم حذف المتجر بنجاح!');
      } else {
        alert(`فشل حذف المتجر: ${data.error || 'خطأ غير معروف'}`);
      }
    } catch (err) {
      console.error('Failed to delete store:', err);
      alert('حدث خطأ أثناء حذف المتجر.');
    } finally {
      setDeletingStore(null);
    }
  };

  const fetchData = async () => {
    try {
      const [statsRes, storesRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/stores'),
      ]);

      const statsData = await statsRes.json();
      const storesData = await storesRes.json();

      setStats(statsData);
      setStores(storesData.stores);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mb-4"></div>
          <div className="text-xl text-white font-semibold">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl bottom-0 right-1/3 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-16 h-16 sm:w-24 sm:h-24 object-contain"
            />
            {/* Vertical Divider */}
            <div className="h-14 sm:h-20 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold mb-2">
                <span className="text-white">لوحة </span>
                <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">الإدارة</span>
              </h1>
              <p className="text-purple-300/80">إدارة ومتابعة جميع المتاجر</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
            <Link
              href="/admin/tasks"
              className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 rounded-xl transition-all shadow-lg"
            >
              إدارة المهام
            </Link>
            <Link
              href="/admin/help"
              className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium text-white bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 rounded-xl transition-all shadow-lg"
            >
              طلبات المساعدة
            </Link>
            <Link
              href="/"
              className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium text-purple-300 hover:text-white bg-purple-900/30 hover:bg-purple-800/50 rounded-xl transition-all shadow-lg hover:shadow-purple-500/50 border border-purple-500/30 hover:border-purple-400/50 backdrop-blur-sm"
            >
              الصفحة الرئيسية
            </Link>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-purple-950/40 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-900/30 p-6 border border-purple-500/20">
              <h3 className="text-sm font-medium text-purple-300/80 mb-2">
                عدد المتاجر
              </h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {stats.total_stores}
              </p>
            </div>

            <div className="bg-purple-950/40 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-900/30 p-6 border border-purple-500/20">
              <h3 className="text-sm font-medium text-purple-300/80 mb-2">
                متوسط الإنجاز
              </h3>
              <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                {stats.average_completion}%
              </p>
            </div>

            <div className="bg-purple-950/40 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-900/30 p-6 border border-purple-500/20">
              <h3 className="text-sm font-medium text-purple-300/80 mb-2">
                أكثر قسم منجز
              </h3>
              <p className="text-lg font-semibold text-white">
                {stats.most_completed_category}
              </p>
            </div>

            <div className="bg-purple-950/40 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-900/30 p-6 border border-purple-500/20">
              <h3 className="text-sm font-medium text-purple-300/80 mb-2">
                أقل قسم منجز
              </h3>
              <p className="text-lg font-semibold text-white">
                {stats.least_completed_category}
              </p>
            </div>
          </div>
        )}

        <div className="bg-purple-950/40 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-900/30 overflow-hidden border border-purple-500/20">
          <div className="px-4 sm:px-6 py-4 border-b border-purple-500/20">
            <h2 className="text-xl sm:text-2xl font-bold text-white">جميع المتاجر</h2>
          </div>

          {/* Mobile View - Cards */}
          <div className="block lg:hidden divide-y divide-purple-500/20">
            {stores.map((store) => (
              <div key={store.id} className="p-4 hover:bg-purple-900/20 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-white font-medium text-sm">{store.store_url}</h3>
                    <p className="text-purple-400/60 text-xs mt-1">
                      {new Date(store.created_at).toLocaleDateString('ar-SA')}
                    </p>
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
                <div className="flex gap-3">
                  <Link
                    href={`/admin/store/${store.id}`}
                    className="flex-1 text-center py-2 text-xs text-purple-400 bg-purple-900/30 rounded-lg hover:bg-purple-800/50 transition-colors"
                  >
                    عرض التفاصيل
                  </Link>
                  <button
                    onClick={() => handleDeleteStore(store.id, store.store_url)}
                    disabled={deletingStore === store.id}
                    className="px-4 py-2 text-xs text-red-400 bg-red-900/20 rounded-lg hover:bg-red-900/40 transition-colors disabled:opacity-50"
                  >
                    {deletingStore === store.id ? '...' : 'حذف'}
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
                    المهام المنجزة
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {store.store_url}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-300">
                      {store.completed_tasks} / {store.total_tasks}
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
                      {new Date(store.created_at).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/store/${store.id}`}
                          className="text-purple-400 hover:text-fuchsia-400 font-medium transition-colors"
                        >
                          عرض التفاصيل
                        </Link>
                        <button
                          onClick={() => handleDeleteStore(store.id, store.store_url)}
                          disabled={deletingStore === store.id}
                          className="text-red-400 hover:text-red-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          title="حذف المتجر"
                        >
                          {deletingStore === store.id ? (
                            <span className="text-xs">جاري الحذف...</span>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              حذف
                            </>
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
      </div>
    </div>
  );
}
