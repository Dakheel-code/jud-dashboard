'use client';

import Link from 'next/link';

interface Task {
  id: string;
  title: string;
  store: string;
  due: string;
  status: string;
  priority: string;
  assignee?: string;
}

interface TodayTasksWidgetProps {
  tasks: Task[];
}

export default function TodayTasksWidget({ tasks }: TodayTasksWidgetProps) {
  // عرض أول 8 مهام فقط
  const displayTasks = tasks.slice(0, 8);
  
  // حساب عدد المهام المتأخرة
  const overdueCount = tasks.filter(t => t.status === 'overdue').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;

  // الحصول على لون الأولوية
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // الحصول على لون الحالة
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'overdue':
        return {
          bg: 'bg-red-900/20 border border-red-500/30',
          text: 'text-red-400',
          badge: 'bg-red-500/20 text-red-400'
        };
      case 'in_progress':
        return {
          bg: 'bg-blue-900/20 border border-blue-500/30',
          text: 'text-blue-400',
          badge: 'bg-blue-500/20 text-blue-400'
        };
      case 'pending':
      default:
        return {
          bg: 'bg-purple-900/20',
          text: 'text-purple-300',
          badge: 'bg-purple-500/20 text-purple-300'
        };
    }
  };

  // الحصول على نص الحالة
  const getStatusText = (status: string) => {
    switch (status) {
      case 'overdue': return 'متأخرة';
      case 'in_progress': return 'قيد التنفيذ';
      case 'pending': return 'معلقة';
      case 'completed': return 'مكتملة';
      default: return status;
    }
  };

  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-5 border border-purple-500/20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">مهام اليوم</h3>
            <div className="flex items-center gap-2 text-xs">
              {overdueCount > 0 && (
                <span className="text-red-400">{overdueCount} متأخرة</span>
              )}
              {overdueCount > 0 && pendingCount > 0 && (
                <span className="text-purple-300/40">•</span>
              )}
              {pendingCount > 0 && (
                <span className="text-purple-300/60">{pendingCount} معلقة</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin/store-tasks"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/30 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>إنشاء مهمة</span>
          </Link>
          <Link
            href="/admin/store-tasks"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-colors"
          >
            <span>لوحة المهام</span>
            <svg className="w-3.5 h-3.5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Content */}
      {displayTasks.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-white font-medium mb-1">لا توجد مهام لليوم!</h4>
          <p className="text-purple-300/60 text-sm mb-4">جميع المهام مكتملة أو لا توجد مهام مجدولة</p>
          <Link
            href="/admin/store-tasks"
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>إنشاء مهمة جديدة</span>
          </Link>
        </div>
      ) : (
        // Tasks List
        <div className="space-y-2">
          {displayTasks.map((task) => {
            const statusStyle = getStatusStyle(task.status);
            
            return (
              <Link
                key={task.id}
                href={`/admin/tasks/${task.id}`}
                className={`flex items-center gap-3 p-3 rounded-xl ${statusStyle.bg} hover:opacity-90 transition-all group`}
              >
                {/* Priority Indicator */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(task.priority)}`}></div>

                {/* Task Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white text-sm font-medium truncate group-hover:text-blue-400 transition-colors">
                      {task.title}
                    </span>
                    {task.status === 'overdue' && (
                      <span className={`px-1.5 py-0.5 rounded text-xs ${statusStyle.badge}`}>
                        {getStatusText(task.status)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-purple-300/60">
                    <span className="truncate">{task.store}</span>
                    {task.assignee && (
                      <>
                        <span>•</span>
                        <span className="truncate">{task.assignee}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Due Time */}
                <div className={`text-xs font-medium flex-shrink-0 ${statusStyle.text}`}>
                  {task.due}
                </div>

                {/* Arrow */}
                <svg className="w-4 h-4 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-180 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}

      {/* View All Link */}
      {tasks.length > 8 && (
        <div className="mt-4 text-center">
          <Link
            href="/admin/store-tasks"
            className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <span>عرض كل المهام ({tasks.length})</span>
            <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
