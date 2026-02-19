'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const TaskComments     = dynamic(() => import('@/components/tasks').then(m => ({ default: m.TaskComments })),     { ssr: false });
const TaskAttachments  = dynamic(() => import('@/components/tasks').then(m => ({ default: m.TaskAttachments })),  { ssr: false });
const HelpRequestModal = dynamic(() => import('@/components/tasks').then(m => ({ default: m.HelpRequestModal })), { ssr: false });
const ReassignModal    = dynamic(() => import('@/components/tasks').then(m => ({ default: m.ReassignModal })),    { ssr: false });
const TaskActivityLog  = dynamic(() => import('@/components/tasks').then(m => ({ default: m.TaskActivityLog })),  { ssr: false });

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
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
  created_user?: {
    id: string;
    name: string;
    username: string;
  };
  participants?: Array<{
    id: string;
    role: string;
    notes?: string;
    added_at: string;
    user: {
      id: string;
      name: string;
      username: string;
      avatar?: string;
    };
  }>;
  activity_log?: Array<{
    id: string;
    action: string;
    meta: any;
    created_at: string;
    user?: {
      id: string;
      name: string;
      username: string;
    };
  }>;
}

interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string;
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'معلقة',       color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  in_progress: { label: 'قيد التنفيذ', color: 'text-blue-400',   bg: 'bg-blue-500/20 border-blue-500/30'   },
  waiting:     { label: 'بانتظار',     color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30'},
  done:        { label: 'مكتملة',      color: 'text-green-400',  bg: 'bg-green-500/20 border-green-500/30'  },
  blocked:     { label: 'محظورة',      color: 'text-red-400',    bg: 'bg-red-500/20 border-red-500/30'      },
  canceled:    { label: 'ملغاة',       color: 'text-gray-400',   bg: 'bg-gray-500/20 border-gray-500/30'    }
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  low:      { label: 'منخفضة', color: 'text-gray-400'   },
  normal:   { label: 'عادية',  color: 'text-blue-400'   },
  high:     { label: 'عالية',  color: 'text-orange-400' },
  critical: { label: 'حرجة',   color: 'text-red-400'    }
};

export default function TaskDetailClient() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    fetchTask();
    fetchUsers();
    fetchCurrentUser();
  }, [taskId]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      if (response.ok && data.user) {
        setCurrentUserId(data.user.id);
        setUserRole(data.user.role || '');
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const fetchTask = async () => {
    try {
      const response = await fetch(`/api/admin/store-tasks/${taskId}`);
      const data = await response.json();
      if (response.ok) {
        setTask(data.task);
      }
    } catch (error) {
      console.error('Failed to fetch task:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!task || updating) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/store-tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        await fetchTask();
        window.dispatchEvent(new CustomEvent('refreshActivityLog'));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const addParticipant = async () => {
    if (!selectedUserId || updating) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/store-tasks/${taskId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedUserId, role: 'helper' })
      });
      if (response.ok) {
        await fetchTask();
        setShowHelpModal(false);
        setSelectedUserId('');
      } else {
        const data = await response.json();
        alert(data.error || 'فشل إضافة المشارك');
      }
    } catch (error) {
      console.error('Failed to add participant:', error);
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const isOverdue = () => {
    if (!task?.due_date || task.status === 'done' || task.status === 'canceled') return false;
    return new Date(task.due_date) < new Date();
  };

  const getTimeRemaining = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff < 0) {
      const d = Math.floor(Math.abs(diff) / 86400000);
      const h = Math.floor((Math.abs(diff) % 86400000) / 3600000);
      return d > 0 ? `متأخر ${d} يوم${h > 0 ? ` و ${h} ساعة` : ''}` : `متأخر ${h} ساعة`;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    return d > 0 ? `متبقي ${d} يوم${h > 0 ? ` و ${h} ساعة` : ''}` : `متبقي ${h} ساعة`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0118]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
          </div>
          <p className="text-white text-lg">جاري تحميل المهمة...</p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0118]">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">المهمة غير موجودة</p>
          <Link href="/tasks/my" className="text-purple-400 hover:underline">العودة للمهام</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden">
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/tasks/my" className="p-2 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-lg transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-white">تفاصيل المهمة</h1>
        </div>

        {/* Main Card */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{task.title}</h2>
              {task.store && (
                <p className="text-purple-300/80 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {task.store.store_name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full border ${statusLabels[task.status]?.bg} ${statusLabels[task.status]?.color}`}>
                {statusLabels[task.status]?.label || task.status}
              </span>
              {isOverdue() && (
                <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400">متأخرة</span>
              )}
            </div>
          </div>

          {task.description && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-purple-300/80 mb-2">الوصف</h3>
              <p className="text-white bg-purple-900/30 rounded-xl p-4 border border-purple-500/20">{task.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/20">
              <p className="text-sm text-purple-300/60 mb-1">الأولوية</p>
              <p className={`font-medium ${priorityLabels[task.priority]?.color}`}>{priorityLabels[task.priority]?.label || task.priority}</p>
            </div>
            <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/20">
              <p className="text-sm text-purple-300/60 mb-1">النوع</p>
              <p className="text-white font-medium">{task.type === 'template' ? 'من القالب' : task.type === 'auto' ? 'تلقائية' : 'يدوية'}</p>
            </div>
            <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/20">
              <p className="text-sm text-purple-300/60 mb-1">موعد التسليم</p>
              <p className={`font-medium ${isOverdue() ? 'text-red-400' : 'text-white'}`}>{task.due_date ? formatDate(task.due_date) : '-'}</p>
              {task.due_date && <p className={`text-xs mt-1 ${isOverdue() ? 'text-red-400' : 'text-purple-400/70'}`}>{getTimeRemaining(task.due_date)}</p>}
            </div>
            <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/20">
              <p className="text-sm text-purple-300/60 mb-1">المكلف</p>
              <p className="text-white font-medium">{task.assigned_user?.name || 'غير محدد'}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-purple-300/80 mb-3">تغيير الحالة</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusLabels).map(([key, value]) => (
                <button key={key} onClick={() => updateStatus(key)} disabled={updating || task.status === key}
                  className={`px-4 py-2 rounded-lg border transition-all disabled:opacity-50 ${task.status === key ? `${value.bg} ${value.color}` : 'bg-purple-900/30 border-purple-500/30 text-purple-300 hover:border-purple-400/50'}`}>
                  {value.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={() => setShowHelpModal(true)}
              className="flex-1 min-w-[140px] py-3 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 rounded-xl border border-cyan-500/30 transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              طلب مساعدة
            </button>
            {['super_admin', 'admin', 'team_leader', 'manager'].includes(userRole) && (
              <button onClick={() => setShowReassignModal(true)}
                className="flex-1 min-w-[140px] py-3 bg-orange-600/30 hover:bg-orange-600/50 text-orange-300 rounded-xl border border-orange-500/30 transition-all flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                إعادة إسناد
              </button>
            )}
          </div>
        </div>

        <div className="mb-6"><TaskComments taskId={taskId} currentUserId={currentUserId} userRole={userRole} /></div>
        <div className="mb-6"><TaskAttachments taskId={taskId} currentUserId={currentUserId} userRole={userRole} /></div>

        {task.participants && task.participants.length > 0 && (
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6 mb-6">
            <h3 className="text-lg font-bold text-white mb-4">المشاركون</h3>
            <div className="space-y-3">
              {task.participants.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-purple-900/30 rounded-xl p-3 border border-purple-500/20">
                  <div className="w-10 h-10 rounded-full bg-purple-600/30 flex items-center justify-center text-white font-bold">
                    {p.user?.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{p.user?.name}</p>
                    <p className="text-sm text-purple-300/60">{p.role === 'helper' ? 'مساعد' : p.role === 'reviewer' ? 'مراجع' : 'مراقب'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6"><TaskActivityLog taskId={taskId} /></div>
      </div>

      <HelpRequestModal taskId={taskId} taskTitle={task?.title || ''} isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} currentUserId={currentUserId} userRole={userRole} />
      <ReassignModal taskId={taskId} taskTitle={task?.title || ''} currentAssigneeId={task?.assigned_user?.id} isOpen={showReassignModal} onClose={() => setShowReassignModal(false)}
        onSuccess={(newAssignee) => {
          setTask(prev => prev ? { ...prev, assigned_user: { id: newAssignee.id, name: newAssignee.name, username: newAssignee.username, avatar: newAssignee.avatar } } : null);
        }}
      />
    </div>
  );
}
