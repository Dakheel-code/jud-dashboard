'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TasksByCategory } from '@/types';
import AdminAuth from '@/components/AdminAuth';

interface StoreFullData {
  id: string;
  store_name: string;
  store_url: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  notes: string;
  created_at: string;
  subscription_start_date?: string;
  account_manager?: {
    id: string;
    name: string;
  };
}

interface StoreMetadata {
  name: string;
  logo: string | null;
}

interface Stats {
  total: number;
  completed: number;
  percentage: number;
}

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

function StoreDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const storeUrl = decodeURIComponent(params.id as string);

  const [storeData, setStoreData] = useState<StoreFullData | null>(null);
  const [storeMetadata, setStoreMetadata] = useState<StoreMetadata | null>(null);
  const [tasks, setTasks] = useState<TasksByCategory>({});
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'info'>('tasks');

  useEffect(() => {
    if (storeUrl) {
      fetchStoreData();
    }
  }, [storeUrl]);

  const fetchStoreData = async () => {
    try {
      const response = await fetch(`/api/tasks?store_url=${encodeURIComponent(storeUrl)}`);
      const data = await response.json();

      if (response.ok) {
        setTasks(data.tasks || {});
        setStats(data.stats || { total: 0, completed: 0, percentage: 0 });
        setStoreId(data.store_id);
        setStoreData(data.store);
        
        // جلب معلومات المتجر (الشعار والاسم)
        if (data.store_url) {
          const metaResponse = await fetch(`/api/store/metadata?url=${encodeURIComponent(data.store_url)}`);
          const metaData = await metaResponse.json();
          setStoreMetadata({
            name: metaData.name || data.store_url,
            logo: metaData.logo,
          });
        }
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch store data:', err);
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    if (!storeId) return;
    
    setTogglingTask(taskId);
    try {
      const response = await fetch('/api/tasks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, task_id: taskId }),
      });

      if (response.ok) {
        // تحديث حالة المهمة محلياً
        setTasks(prevTasks => {
          const newTasks = { ...prevTasks };
          for (const category in newTasks) {
            newTasks[category] = newTasks[category].map(task =>
              task.id === taskId ? { ...task, is_done: !currentStatus } : task
            );
          }
          return newTasks;
        });

        // تحديث الإحصائيات
        setStats(prev => {
          const newCompleted = currentStatus ? prev.completed - 1 : prev.completed + 1;
          return {
            ...prev,
            completed: newCompleted,
            percentage: Math.round((newCompleted / prev.total) * 100)
          };
        });
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    } finally {
      setTogglingTask(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0118] relative overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
          </div>
          <div className="text-xl text-white font-semibold">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  const getCategoryStats = (categoryTasks: any[]) => {
    const completed = categoryTasks.filter(t => t.is_done).length;
    return { completed, total: categoryTasks.length };
  };

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            {storeMetadata?.logo && (
              <img 
                src={storeMetadata.logo} 
                alt={storeMetadata.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500/30"
              />
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl text-white" style={{ fontFamily: "'Suisse Intl', var(--font-cairo), sans-serif", fontWeight: 600 }}>
                {storeMetadata?.name || storeData?.store_name || 'تفاصيل المتجر'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-purple-300/70 text-sm">{storeData?.store_url}</p>
                <a 
                  href={`https://${storeData?.store_url}`}
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
            </div>
          </div>
          <Link
            href="/admin"
            className="p-3 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-xl transition-all"
            title="العودة للوحة الإدارة"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>

        {/* Store Info Card */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 mb-6 overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-purple-500/20 rtl:divide-x-reverse">
            {/* نسبة الإنجاز */}
            <div className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{stats.percentage}%</span>
              </div>
              <p className="text-xs text-purple-300/70">نسبة الإنجاز</p>
              <p className="text-sm text-white font-medium">{stats.completed}/{stats.total}</p>
            </div>
            
            {/* مدير الحساب */}
            <div className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-xs text-purple-300/70">مدير الحساب</p>
              {storeData?.account_manager ? (
                <Link href={`/admin/users/${storeData.account_manager.id}`} className="text-sm text-white font-medium hover:text-fuchsia-400 transition-colors">
                  {storeData.account_manager.name.split(' ')[0]}
                </Link>
              ) : (
                <p className="text-sm text-purple-400">غير محدد</p>
              )}
            </div>
            
            {/* صاحب المتجر */}
            <div className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-green-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-xs text-purple-300/70">صاحب المتجر</p>
              <p className="text-sm text-white font-medium">{storeData?.owner_name || '-'}</p>
            </div>
            
            {/* تاريخ الإضافة */}
            <div className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-xs text-purple-300/70">تاريخ الإضافة</p>
              <p className="text-sm text-white font-medium">{storeData?.created_at ? getTimeAgo(storeData.created_at) : '-'}</p>
            </div>
          </div>
          
          {/* بيانات الاشتراك */}
          <div className="border-t border-purple-500/20 p-4">
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${storeData?.subscription_start_date ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-sm text-purple-300">
                  {storeData?.subscription_start_date ? 'الاشتراك فعال' : 'في انتظار إطلاق الحملات'}
                </span>
              </div>
              {storeData?.subscription_start_date && (
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-purple-300">بداية الاشتراك:</span>
                  <span className="text-white font-medium">
                    {new Date(storeData.subscription_start_date).toLocaleDateString('ar-SA')}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* معلومات التواصل */}
          {(storeData?.owner_phone || storeData?.owner_email) && (
            <div className="border-t border-purple-500/20 p-4">
              <div className="flex flex-wrap gap-4 justify-center">
                {storeData?.owner_phone && (
                  <a href={`tel:${storeData.owner_phone}`} className="flex items-center gap-2 text-sm text-purple-300 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {storeData.owner_phone}
                  </a>
                )}
                {storeData?.owner_email && (
                  <a href={`mailto:${storeData.owner_email}`} className="flex items-center gap-2 text-sm text-purple-300 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {storeData.owner_email}
                  </a>
                )}
              </div>
            </div>
          )}
          
          {/* ملاحظات */}
          {storeData?.notes && (
            <div className="border-t border-purple-500/20 p-4">
              <p className="text-xs text-purple-300/70 mb-1">ملاحظات</p>
              <p className="text-sm text-white">{storeData.notes}</p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-purple-300">التقدم الكلي</span>
            <span className="text-sm font-bold text-white">{stats.percentage}%</span>
          </div>
          <div className="h-3 bg-purple-900/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>

        {/* Section Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">قائمة المهام</h2>
        </div>

        {/* Tasks by Category */}
        <div className="space-y-6">
          {Object.entries(tasks).map(([category, categoryTasks]) => {
            const catStats = getCategoryStats(categoryTasks);
            return (
              <div key={category} className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
                {/* Category Header */}
                <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      catStats.completed === catStats.total 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {catStats.completed === catStats.total ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white">{category}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${
                      catStats.completed === catStats.total ? 'text-green-400' : 'text-purple-300'
                    }`}>
                      {catStats.completed}/{catStats.total}
                    </span>
                    {catStats.completed === catStats.total && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">مكتمل</span>
                    )}
                  </div>
                </div>

                {/* Tasks List */}
                <div className="divide-y divide-purple-500/10">
                  {categoryTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-4 p-4 transition-all hover:bg-purple-500/5 ${
                        task.is_done ? 'bg-green-500/5' : ''
                      }`}
                    >
                      {/* Toggle Button */}
                      <button
                        onClick={() => handleToggleTask(task.id, task.is_done)}
                        disabled={togglingTask === task.id}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          task.is_done
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-purple-500/50 hover:border-purple-400'
                        } ${togglingTask === task.id ? 'opacity-50' : ''}`}
                      >
                        {togglingTask === task.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : task.is_done ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : null}
                      </button>

                      {/* Task Title */}
                      <span className={`flex-1 ${task.is_done ? 'text-purple-400 line-through' : 'text-white'}`}>
                        {task.title}
                      </span>

                      {/* Status Badge */}
                      <button
                        onClick={() => handleToggleTask(task.id, task.is_done)}
                        disabled={togglingTask === task.id}
                        className={`p-2 sm:px-3 sm:py-1 rounded-lg text-xs font-medium transition-all ${
                          task.is_done
                            ? 'text-green-400 border border-green-500/30 hover:border-red-400/50 hover:bg-red-500/10 hover:text-red-400'
                            : 'text-purple-300 border border-purple-500/30 hover:border-green-400/50 hover:bg-green-500/10 hover:text-green-400'
                        }`}
                        title={task.is_done ? 'إلغاء الإنجاز' : 'تحديد كمنجز'}
                      >
                        <span className="hidden sm:inline">{task.is_done ? 'إلغاء الإنجاز' : 'تحديد كمنجز'}</span>
                        <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {task.is_done ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          )}
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function StoreDetailsPage() {
  return (
    <AdminAuth>
      <StoreDetailsContent />
    </AdminAuth>
  );
}
