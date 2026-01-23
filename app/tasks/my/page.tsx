'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  due_date?: string;
  created_at: string;
  is_overdue: boolean;
  is_assigned_to_me: boolean;
  is_my_store: boolean;
  is_participant: boolean;
  store?: {
    id: string;
    store_name: string;
    store_url: string;
  };
  assigned_user?: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

interface Counts {
  total: number;
  pending: number;
  in_progress: number;
  waiting: number;
  done: number;
  blocked: number;
  critical: number;
  high: number;
  overdue: number;
}

interface MyStore {
  id: string;
  store_name: string;
  store_url: string;
  total_tasks: number;
  completed_tasks: number;
  remaining_tasks: number;
}

type TabType = 'all' | 'overdue' | 'critical' | 'pending' | 'in_progress' | 'done';

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'معلقة', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  in_progress: { label: 'قيد التنفيذ', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
  waiting: { label: 'بانتظار', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' },
  done: { label: 'مكتملة', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30' },
  blocked: { label: 'محظورة', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
  canceled: { label: 'ملغاة', color: 'text-gray-400', bg: 'bg-gray-500/20 border-gray-500/30' }
};

const priorityLabels: Record<string, { label: string; color: string; icon: string }> = {
  low: { label: 'منخفضة', color: 'text-gray-400', icon: '○' },
  normal: { label: 'عادية', color: 'text-blue-400', icon: '●' },
  high: { label: 'عالية', color: 'text-orange-400', icon: '▲' },
  critical: { label: 'حرجة', color: 'text-red-400', icon: '⚠' }
};

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [myStores, setMyStores] = useState<MyStore[]>([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks/my');
      const data = await response.json();
      
      if (response.ok) {
        setTasks(data.tasks || []);
        setCounts(data.counts || null);
        setMyStores(data.my_stores || []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // فلترة المهام حسب التاب والبحث
  const filteredTasks = tasks.filter(task => {
    // فلتر البحث
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // فلتر التاب
    switch (activeTab) {
      case 'overdue':
        return task.is_overdue;
      case 'critical':
        return task.priority === 'critical';
      case 'pending':
        return task.status === 'pending';
      case 'in_progress':
        return task.status === 'in_progress';
      case 'done':
        return task.status === 'done';
      default:
        return true;
    }
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'done' || task.status === 'canceled') return false;
    return new Date(task.due_date) < new Date();
  };

  const getTimeRemaining = (dateStr: string) => {
    const now = new Date();
    const dueDate = new Date(dateStr);
    const diff = dueDate.getTime() - now.getTime();
    
    if (diff < 0) {
      const absDiff = Math.abs(diff);
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        return `متأخر ${days} يوم${hours > 0 ? ` و ${hours} ساعة` : ''}`;
      } else if (hours > 0) {
        const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
        return `متأخر ${hours} ساعة${minutes > 0 ? ` و ${minutes} دقيقة` : ''}`;
      } else {
        const minutes = Math.floor(absDiff / (1000 * 60));
        return `متأخر ${minutes} دقيقة`;
      }
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `متبقي ${days} يوم${hours > 0 ? ` و ${hours} ساعة` : ''}`;
    } else if (hours > 0) {
      return `متبقي ${hours} ساعة${minutes > 0 ? ` و ${minutes} دقيقة` : ''}`;
    } else {
      return `متبقي ${minutes} دقيقة`;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0118]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-fuchsia-500 animate-spin" style={{ animationDirection: 'reverse' }}></div>
          </div>
          <p className="text-white text-lg">جاري تحميل المهام...</p>
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
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src="/logo.png" alt="Logo" className="w-14 h-14 sm:w-20 sm:h-20 object-contain" />
            <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
            <div>
              <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>
                مهامي
              </h1>
              <p className="text-purple-300/80 text-xs sm:text-sm">إدارة ومتابعة مهامك</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* زر إدارة المهام */}
            <Link
              href="/admin/store-tasks"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white rounded-xl transition-all text-sm font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              إدارة المهام
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        {counts && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
            <button
              onClick={() => setActiveTab('all')}
              className={`p-4 rounded-xl border transition-all text-right ${
                activeTab === 'all' 
                  ? 'bg-purple-500/30 border-purple-400' 
                  : 'bg-purple-950/40 border-purple-500/20 hover:border-purple-400/50'
              }`}
            >
              <p className="text-2xl font-bold text-white">{counts.total}</p>
              <p className="text-sm text-purple-300/80">الكل</p>
            </button>
            <button
              onClick={() => setActiveTab('overdue')}
              className={`p-4 rounded-xl border transition-all text-right ${
                activeTab === 'overdue' 
                  ? 'bg-red-500/30 border-red-400' 
                  : 'bg-purple-950/40 border-red-500/20 hover:border-red-400/50'
              }`}
            >
              <p className="text-2xl font-bold text-red-400">{counts.overdue}</p>
              <p className="text-sm text-red-300/80">متأخرة</p>
            </button>
            <button
              onClick={() => setActiveTab('critical')}
              className={`p-4 rounded-xl border transition-all text-right ${
                activeTab === 'critical' 
                  ? 'bg-orange-500/30 border-orange-400' 
                  : 'bg-purple-950/40 border-orange-500/20 hover:border-orange-400/50'
              }`}
            >
              <p className="text-2xl font-bold text-orange-400">{counts.critical}</p>
              <p className="text-sm text-orange-300/80">حرجة</p>
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`p-4 rounded-xl border transition-all text-right ${
                activeTab === 'pending' 
                  ? 'bg-yellow-500/30 border-yellow-400' 
                  : 'bg-purple-950/40 border-yellow-500/20 hover:border-yellow-400/50'
              }`}
            >
              <p className="text-2xl font-bold text-yellow-400">{counts.pending}</p>
              <p className="text-sm text-yellow-300/80">معلقة</p>
            </button>
            <button
              onClick={() => setActiveTab('in_progress')}
              className={`p-4 rounded-xl border transition-all text-right ${
                activeTab === 'in_progress' 
                  ? 'bg-blue-500/30 border-blue-400' 
                  : 'bg-purple-950/40 border-blue-500/20 hover:border-blue-400/50'
              }`}
            >
              <p className="text-2xl font-bold text-blue-400">{counts.in_progress}</p>
              <p className="text-sm text-blue-300/80">قيد التنفيذ</p>
            </button>
            <button
              onClick={() => setActiveTab('done')}
              className={`p-4 rounded-xl border transition-all text-right ${
                activeTab === 'done' 
                  ? 'bg-green-500/30 border-green-400' 
                  : 'bg-purple-950/40 border-green-500/20 hover:border-green-400/50'
              }`}
            >
              <p className="text-2xl font-bold text-green-400">{counts.done}</p>
              <p className="text-sm text-green-300/80">مكتملة</p>
            </button>
          </div>
        )}

        {/* متاجري - بطاقات بسيطة */}
        {myStores.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              متاجري
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {myStores.map((store) => {
                const percentage = store.total_tasks > 0 
                  ? Math.round((store.completed_tasks / store.total_tasks) * 100) 
                  : 0;

                return (
                  <Link
                    key={store.id}
                    href={`/store/${store.store_url}`}
                    className="bg-purple-950/40 rounded-xl border border-purple-500/20 p-4 hover:bg-purple-900/40 hover:border-purple-400/50 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${store.store_url}&sz=32`}
                        alt=""
                        className="w-10 h-10 rounded-lg"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                          {store.store_name}
                        </h3>
                        <p className="text-purple-400/60 text-xs truncate">{store.store_url}</p>
                      </div>
                    </div>
                    
                    {/* المهام المتبقية */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {store.remaining_tasks > 0 ? (
                          <>
                            <span className="w-6 h-6 flex items-center justify-center bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold">
                              {store.remaining_tasks}
                            </span>
                            <span className="text-orange-300/80 text-sm">مهمة متبقية</span>
                          </>
                        ) : (
                          <>
                            <span className="w-6 h-6 flex items-center justify-center bg-green-500/20 text-green-400 rounded-full text-xs">
                              ✓
                            </span>
                            <span className="text-green-300/80 text-sm">مكتمل</span>
                          </>
                        )}
                      </div>
                      <span className={`text-xs ${percentage === 100 ? 'text-green-400' : 'text-purple-300/60'}`}>
                        {percentage}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 h-1.5 bg-purple-900/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${percentage === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-fuchsia-500'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="بحث في المهام..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-12 pl-4 py-3 bg-purple-950/40 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none placeholder-purple-400/50"
            />
          </div>
        </div>

        {/* Tasks Cards Grid */}
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 bg-purple-950/40 rounded-2xl border border-purple-500/20">
            <svg className="w-16 h-16 mx-auto text-purple-400/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-purple-300/60 text-lg">لا توجد مهام</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredTasks.map(task => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className={`bg-purple-950/40 rounded-xl border p-3 transition-all hover:bg-purple-900/40 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer group ${
                  task.is_overdue 
                    ? 'border-red-500/50 hover:border-red-400' 
                    : task.priority === 'critical'
                      ? 'border-orange-500/50 hover:border-orange-400'
                      : 'border-purple-500/20 hover:border-purple-400/50'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm ${priorityLabels[task.priority]?.color || 'text-gray-400'}`}>
                      {priorityLabels[task.priority]?.icon || '●'}
                    </span>
                    {task.is_overdue && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded border border-red-500/30">
                        متأخرة
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded border text-[10px] ${statusLabels[task.status]?.bg || 'bg-gray-500/20 border-gray-500/30'} ${statusLabels[task.status]?.color || 'text-gray-400'}`}>
                    {statusLabels[task.status]?.label || task.status}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-white font-medium text-sm mb-1.5 line-clamp-2 group-hover:text-purple-200 transition-colors">
                  {task.title}
                </h3>

                {/* Store */}
                {task.store && (
                  <div className="flex items-center gap-1.5 mb-2 text-xs text-purple-300/70">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="truncate">{task.store.store_name}</span>
                  </div>
                )}

                {/* Due Date */}
                {task.due_date && (
                  <div className={`flex items-center gap-1.5 text-[10px] mb-2 ${task.is_overdue ? 'text-red-400' : 'text-purple-400/70'}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{getTimeRemaining(task.due_date)}</span>
                  </div>
                )}

                {/* Footer - Assigned To */}
                <div className="flex items-center justify-between pt-2 border-t border-purple-500/20">
                  <div className="flex items-center gap-1">
                    {task.assigned_user ? (
                      <span className="px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 rounded border border-purple-500/30 truncate max-w-[100px]">
                        {task.is_assigned_to_me ? 'مسندة لي' : task.assigned_user.name}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-300 rounded border border-green-500/30">
                        مسندة للكل
                      </span>
                    )}
                    {task.is_participant && !task.is_assigned_to_me && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                        مشارك
                      </span>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-purple-400/50 group-hover:text-purple-400 group-hover:-translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
