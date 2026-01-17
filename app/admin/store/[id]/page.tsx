'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TasksByCategory } from '@/types';
import AdminAuth from '@/components/AdminAuth';

interface StoreDetails {
  store_url: string;
  name: string;
  logo: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  completed: number;
  percentage: number;
}

function StoreDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [storeDetails, setStoreDetails] = useState<StoreDetails | null>(null);
  const [tasks, setTasks] = useState<TasksByCategory>({});
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);

  useEffect(() => {
    if (storeId) {
      fetchStoreData();
    }
  }, [storeId]);

  const fetchStoreData = async () => {
    try {
      const response = await fetch(`/api/tasks?store_id=${storeId}`);
      const data = await response.json();

      if (response.ok) {
        setTasks(data.tasks);
        setStats(data.stats);
        
        // جلب معلومات المتجر
        if (data.store_url) {
          const metaResponse = await fetch(`/api/store/metadata?url=${encodeURIComponent(data.store_url)}`);
          const metaData = await metaResponse.json();
          setStoreDetails({
            store_url: data.store_url,
            name: metaData.name || data.store_url,
            logo: metaData.logo,
            created_at: new Date().toISOString(),
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            {storeDetails?.logo && (
              <img 
                src={storeDetails.logo} 
                alt={storeDetails.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500/30"
              />
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {storeDetails?.name || 'تفاصيل المتجر'}
              </h1>
              <p className="text-purple-300/70 text-sm">{storeDetails?.store_url}</p>
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

        {/* Stats Card */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{stats.percentage}%</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">نسبة الإنجاز</h3>
                <p className="text-purple-300/70">{stats.completed} من {stats.total} مهمة مكتملة</p>
              </div>
            </div>
            <div className="w-full sm:w-64">
              <div className="h-3 bg-purple-900/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
            </div>
          </div>
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
