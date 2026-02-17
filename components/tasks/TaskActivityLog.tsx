'use client';

import { useState, useEffect } from 'react';

interface Activity {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
}

interface TaskActivityLogProps {
  taskId: string;
}

export default function TaskActivityLog({ taskId }: TaskActivityLogProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchActivities();
    
    // Listen for refresh events
    const handleRefresh = () => {
      setTimeout(() => fetchActivities(), 800);
    };
    window.addEventListener('refreshActivityLog', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshActivityLog', handleRefresh);
    };
  }, [taskId]);

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/activity`);
      const data = await response.json();
      if (response.ok) {
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
    setLoading(false);
  };

  const formatTime = (date: string) => {
    try {
      const d = new Date(date);
      return d.toLocaleDateString('ar-SA') + ' ' + d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return date;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return (
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        );
      case 'updated':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
        );
      case 'commented':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        );
      case 'attached':
        return (
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </div>
        );
      case 'reassigned':
        return (
          <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        );
      case 'help_requested':
        return (
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        );
      case 'status_changed':
        return (
          <div className="w-8 h-8 rounded-full bg-fuchsia-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'priority_changed':
        return (
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'due_date_changed':
        return (
          <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'assigned':
        return (
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const statusLabels: Record<string, string> = {
    pending: 'قيد الانتظار',
    in_progress: 'قيد التنفيذ',
    done: 'مكتملة',
    completed: 'مكتملة',
    cancelled: 'ملغاة',
    canceled: 'ملغاة',
    blocked: 'معلقة',
    waiting: 'في الانتظار',
    review: 'قيد المراجعة'
  };

  const priorityLabels: Record<string, string> = {
    low: 'منخفضة',
    medium: 'متوسطة',
    high: 'عالية',
    urgent: 'عاجلة'
  };

  const getActionText = (activity: Activity) => {
    const userName = activity.user?.name || 'مستخدم';
    const details = activity.details || {};
    
    switch (activity.action) {
      case 'created':
        return `${userName} أنشأ المهمة`;
      case 'updated':
        // عرض التفاصيل المحددة
        const updates: string[] = [];
        if (details.title) updates.push('العنوان');
        if (details.description) updates.push('الوصف');
        return `${userName} حدّث ${updates.length > 0 ? updates.join(' و') : 'المهمة'}`;
      case 'commented':
        return `${userName} أضاف تعليقاً`;
      case 'attached':
        return `${userName} أضاف مرفقاً${details.file_name ? ': ' + details.file_name : ''}`;
      case 'reassigned':
      case 'assigned':
        // التحقق من وجود اسم المستخدم المُسند إليه
        const assignedToName = details.to_user_name || details.assigned_user_name || details.assigned_to?.assigned_user_name;
        if (assignedToName) {
          return `${userName} أسند المهمة إلى ${assignedToName}`;
        }
        return `${userName} غيّر المكلف بالمهمة`;
      case 'help_requested':
        return `${userName} طلب مساعدة`;
      case 'status_changed':
        const newStatus = details.status?.new || details.new_status || '';
        const statusText = statusLabels[newStatus] || newStatus;
        return `${userName} غيّر الحالة${statusText ? ' إلى ' + statusText : ''}`;
      case 'priority_changed':
        const newPriority = details.priority?.new || details.new_priority || '';
        const priorityText = priorityLabels[newPriority] || newPriority;
        return `${userName} غيّر الأولوية${priorityText ? ' إلى ' + priorityText : ''}`;
      case 'due_date_changed':
        const newDate = details.due_date?.new;
        return `${userName} غيّر تاريخ الاستحقاق${newDate ? ' إلى ' + new Date(newDate).toLocaleDateString('ar-SA') : ''}`;
      default:
        return `${userName} قام بإجراء`;
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-32 bg-purple-900/30 rounded-xl"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-purple-950/40 rounded-xl border border-purple-500/20 overflow-hidden">
        <div className="p-4 border-b border-purple-500/20 bg-purple-900/30">
          <h3 className="text-white font-medium flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            سجل النشاط
          </h3>
        </div>
        <div className="p-4 text-center text-purple-400/60">
          لا توجد أنشطة بعد
        </div>
      </div>
    );
  }

  const displayedActivities = expanded ? activities : activities.slice(0, 5);

  return (
    <div className="bg-purple-950/40 rounded-xl border border-purple-500/20 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-purple-500/20 bg-purple-900/30">
        <h3 className="text-white font-medium flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          سجل النشاط
        </h3>
      </div>

      {/* Activities */}
      <div className="p-4">
        <div className="space-y-3">
          {displayedActivities.map((activity, index) => (
            <div key={activity.id} className="flex gap-3">
              {/* Icon */}
              {getActionIcon(activity.action)}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-purple-200 text-sm">{getActionText(activity)}</p>
                <p className="text-purple-400/60 text-xs mt-0.5">{formatTime(activity.created_at)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Show More */}
        {activities.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-4 py-2 text-purple-400 hover:text-purple-300 text-sm transition-colors"
          >
            {expanded ? 'عرض أقل' : `عرض المزيد (${activities.length - 5})`}
          </button>
        )}
      </div>
    </div>
  );
}
