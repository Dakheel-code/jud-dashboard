'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminAuth from '@/components/AdminAuth';
import { useBranding } from '@/contexts/BrandingContext';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type: string;
  due_date?: string;
  created_at: string;
  store?: { id: string; store_name: string; store_url: string };
  assigned_user?: { id: string; name: string; username: string; avatar?: string };
  created_user?: { id: string; name: string; username: string };
}

interface Store {
  id: string;
  store_name: string;
}

interface User {
  id: string;
  name: string;
  username: string;
  roles?: string[];
}

interface Counts {
  total: number;
  pending: number;
  in_progress: number;
  done: number;
  critical: number;
  overdue: number;
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'معلقة', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  in_progress: { label: 'قيد التنفيذ', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
  waiting: { label: 'بانتظار', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' },
  done: { label: 'مكتملة', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30' },
  blocked: { label: 'محظورة', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
  canceled: { label: 'ملغاة', color: 'text-gray-400', bg: 'bg-gray-500/20 border-gray-500/30' }
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  low: { label: 'منخفضة', color: 'text-gray-400' },
  normal: { label: 'عادية', color: 'text-blue-400' },
  high: { label: 'عالية', color: 'text-orange-400' },
  critical: { label: 'حرجة', color: 'text-red-400' }
};

const ROLES = [
  { value: 'media_buyer', label: 'الميديا باير', color: 'cyan' },
  { value: 'designer', label: 'المصممين', color: 'pink' },
  { value: 'programmer', label: 'المبرمجين', color: 'yellow' },
  { value: 'web_developer', label: 'مطوري الويب', color: 'indigo' },
  { value: 'account_manager', label: 'مديري الحسابات', color: 'green' },
  { value: 'team_leader', label: 'قادة الفرق', color: 'blue' },
];

function StoreTasksContent() {
  const { branding } = useBranding();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  // Form
  const [formData, setFormData] = useState({
    store_id: '',
    title: '',
    description: '',
    assigned_to: [] as string[],
    assigned_roles: [] as string[],
    assign_to_all: true,
    is_individual: false,
    priority: 'normal',
    due_date: '',
    type: 'manual'
  });
  const [assignType, setAssignType] = useState<'all' | 'employee' | 'team'>('all');
  const [storeSearch, setStoreSearch] = useState('');
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [useDatePicker, setUseDatePicker] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchStores();
    fetchUsers();
  }, [statusFilter, priorityFilter, storeFilter, assignedFilter, searchQuery]);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      if (storeFilter) params.append('store_id', storeFilter);
      if (assignedFilter) params.append('assigned_to', assignedFilter);
      if (searchQuery) params.append('q', searchQuery);

      const response = await fetch(`/api/admin/store-tasks?${params}`);
      const data = await response.json();

      if (response.ok) {
        setTasks(data.tasks || []);
        setCounts(data.counts || null);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/admin/stores');
      const data = await response.json();
      setStores(data.stores || []);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
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

  const fetchParticipants = async (taskId: string) => {
    try {
      const response = await fetch(`/api/admin/store-tasks/${taskId}/participants`);
      const data = await response.json();
      setParticipants(data.participants || []);
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!formData.is_individual && !formData.store_id) {
      alert('يرجى اختيار متجر أو تحديد المهمة كمهمة فردية');
      return;
    }
    if (!formData.title) {
      alert('يرجى إدخال عنوان المهمة');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/store-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchTasks();
      } else {
        const data = await response.json();
        alert(data.error || 'فشل إنشاء المهمة');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/store-tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          assigned_to: formData.assigned_to || null,
          priority: formData.priority,
          due_date: formData.due_date || null,
          status: (selectedTask as any).status
        })
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedTask(null);
        resetForm();
        fetchTasks();
      } else {
        const data = await response.json();
        alert(data.error || 'فشل تحديث المهمة');
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/store-tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAddParticipant = async (userId: string) => {
    if (!selectedTask) return;

    try {
      const response = await fetch(`/api/admin/store-tasks/${selectedTask.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role: 'helper' })
      });

      if (response.ok) {
        fetchParticipants(selectedTask.id);
      } else {
        const data = await response.json();
        alert(data.error || 'فشل إضافة المشارك');
      }
    } catch (error) {
      console.error('Failed to add participant:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المهمة؟')) return;

    try {
      const response = await fetch(`/api/admin/store-tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      store_id: '',
      title: '',
      description: '',
      assigned_to: [],
      assigned_roles: [],
      assign_to_all: true,
      is_individual: false,
      priority: 'normal',
      due_date: '',
      type: 'manual'
    });
    setAssignType('all');
    setStoreSearch('');
    setShowStoreDropdown(false);
    setUseDatePicker(false);
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setFormData({
      store_id: task.store?.id || '',
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_user?.id ? [task.assigned_user.id] : [],
      assigned_roles: [],
      assign_to_all: false,
      is_individual: !task.store,
      priority: task.priority,
      due_date: task.due_date?.split('T')[0] || '',
      type: task.type
    });
    setShowEditModal(true);
  };

  const openParticipantsModal = (task: Task) => {
    setSelectedTask(task);
    fetchParticipants(task.id);
    setShowParticipantsModal(true);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'done' || task.status === 'canceled') return false;
    return new Date(task.due_date) < new Date();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0118]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
          </div>
          <p className="text-white text-lg">جاري التحميل...</p>
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
            <img src={branding.logo || '/logo.png'} alt={branding.companyName || 'Logo'} className="w-14 h-14 sm:w-20 sm:h-20 object-contain" />
            <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
            <div>
              <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>
                إدارة المهام
              </h1>
              <p className="text-purple-300/80 text-xs sm:text-sm">إنشاء وإدارة المهام للمتاجر</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* زر قالب المهام */}
            <Link
              href="/admin/task-management"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <span className="font-medium">قالب المهام</span>
            </Link>
            
            {/* زر مهمة جديدة */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              مهمة جديدة
            </button>
            
                      </div>
        </div>

        {/* Stats */}
        {counts && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="bg-purple-950/40 rounded-xl p-4 border border-purple-500/20">
              <p className="text-2xl font-bold text-white">{counts.total}</p>
              <p className="text-sm text-purple-300/80">الكل</p>
            </div>
            <div className="bg-purple-950/40 rounded-xl p-4 border border-yellow-500/20">
              <p className="text-2xl font-bold text-yellow-400">{counts.pending}</p>
              <p className="text-sm text-yellow-300/80">معلقة</p>
            </div>
            <div className="bg-purple-950/40 rounded-xl p-4 border border-blue-500/20">
              <p className="text-2xl font-bold text-blue-400">{counts.in_progress}</p>
              <p className="text-sm text-blue-300/80">قيد التنفيذ</p>
            </div>
            <div className="bg-purple-950/40 rounded-xl p-4 border border-green-500/20">
              <p className="text-2xl font-bold text-green-400">{counts.done}</p>
              <p className="text-sm text-green-300/80">مكتملة</p>
            </div>
            <div className="bg-purple-950/40 rounded-xl p-4 border border-orange-500/20">
              <p className="text-2xl font-bold text-orange-400">{counts.critical}</p>
              <p className="text-sm text-orange-300/80">حرجة</p>
            </div>
            <div className="bg-purple-950/40 rounded-xl p-4 border border-red-500/20">
              <p className="text-2xl font-bold text-red-400">{counts.overdue}</p>
              <p className="text-sm text-red-300/80">متأخرة</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-purple-950/40 rounded-xl p-4 border border-purple-500/20 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 bg-purple-900/30 border border-purple-500/30 text-white rounded-lg outline-none focus:border-purple-400 placeholder-purple-400/50"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-purple-900/30 border border-purple-500/30 text-white rounded-lg outline-none focus:border-purple-400"
            >
              <option value="">كل الحالات</option>
              {Object.entries(statusLabels).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-purple-900/30 border border-purple-500/30 text-white rounded-lg outline-none focus:border-purple-400"
            >
              <option value="">كل الأولويات</option>
              {Object.entries(priorityLabels).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>

            {/* Store Filter */}
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="px-3 py-2 bg-purple-900/30 border border-purple-500/30 text-white rounded-lg outline-none focus:border-purple-400"
            >
              <option value="">كل المتاجر</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.store_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tasks Table */}
        <div className="bg-purple-950/40 rounded-xl border border-purple-500/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-500/20">
                  <th className="text-right p-4 text-purple-300 font-medium">المهمة</th>
                  <th className="text-right p-4 text-purple-300 font-medium">المتجر</th>
                  <th className="text-right p-4 text-purple-300 font-medium">الحالة</th>
                  <th className="text-right p-4 text-purple-300 font-medium">الأولوية</th>
                  <th className="text-right p-4 text-purple-300 font-medium">المكلف</th>
                  <th className="text-right p-4 text-purple-300 font-medium">موعد التسليم</th>
                  <th className="text-center p-4 text-purple-300 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-purple-300/60">
                      لا توجد مهام
                    </td>
                  </tr>
                ) : (
                  tasks.map(task => (
                    <tr key={task.id} className="border-b border-purple-500/10 hover:bg-purple-900/20">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {isOverdue(task) && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                          )}
                          <span className="text-white font-medium">{task.title}</span>
                        </div>
                      </td>
                      <td className="p-4 text-purple-300">{task.store?.store_name || '-'}</td>
                      <td className="p-4">
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                          className={`px-2 py-1 rounded-lg border text-sm ${statusLabels[task.status]?.bg} ${statusLabels[task.status]?.color} bg-transparent outline-none cursor-pointer`}
                        >
                          {Object.entries(statusLabels).map(([key, val]) => (
                            <option key={key} value={key} className="bg-[#1a0a2e]">{val.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <span className={priorityLabels[task.priority]?.color}>
                          {priorityLabels[task.priority]?.label || task.priority}
                        </span>
                      </td>
                      <td className="p-4 text-purple-300">{task.assigned_user?.name || '-'}</td>
                      <td className="p-4">
                        <span className={isOverdue(task) ? 'text-red-400' : 'text-purple-300'}>
                          {formatDate(task.due_date)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(task)}
                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                            title="تعديل"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openParticipantsModal(task)}
                            className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all"
                            title="المشاركون"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="حذف"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-purple-950/90 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">إنشاء مهمة جديدة</h3>

            <div className="space-y-4">
              {/* خيار مهمة فردية */}
              <div className="flex items-center gap-3 p-3 bg-purple-900/20 rounded-xl border border-purple-500/20">
                <input
                  type="checkbox"
                  id="is_individual"
                  checked={formData.is_individual}
                  onChange={(e) => setFormData({ ...formData, is_individual: e.target.checked, store_id: e.target.checked ? '' : formData.store_id })}
                  className="w-5 h-5 rounded bg-purple-900/50 border-purple-500/50 text-purple-500 focus:ring-purple-500"
                />
                <label htmlFor="is_individual" className="text-purple-200 text-sm cursor-pointer">مهمة فردية (ليست لمتجر معين)</label>
              </div>

              {/* المتجر - يظهر فقط إذا لم تكن مهمة فردية */}
              {!formData.is_individual && (
                <div className="relative">
                  <label className="block text-purple-300 text-sm mb-1">المتجر *</label>
                  {/* زر فتح القائمة */}
                  <button
                    type="button"
                    onClick={() => setShowStoreDropdown(!showStoreDropdown)}
                    className="w-full px-4 py-2 bg-transparent border border-purple-500/30 text-white rounded-xl outline-none focus:border-purple-400 text-right flex items-center justify-between"
                  >
                    <svg className={`w-4 h-4 transition-transform ${showStoreDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    <span>{formData.store_id ? stores.find(s => s.id === formData.store_id)?.store_name : 'اختر متجر...'}</span>
                  </button>
                  
                  {/* القائمة المنسدلة */}
                  {showStoreDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-purple-950/95 backdrop-blur-xl rounded-xl border border-purple-500/30 shadow-xl">
                      {/* خانة البحث */}
                      <input
                        type="text"
                        value={storeSearch}
                        onChange={(e) => setStoreSearch(e.target.value)}
                        placeholder="ابحث عن متجر..."
                        className="w-full px-4 py-2 bg-transparent border-b border-purple-500/20 text-white outline-none text-sm"
                        autoFocus
                      />
                      <div className="max-h-40 overflow-y-auto">
                        {stores
                          .filter(store => store.store_name.toLowerCase().includes(storeSearch.toLowerCase()))
                          .map(store => (
                            <div
                              key={store.id}
                              onClick={() => {
                                setFormData({ ...formData, store_id: store.id });
                                setShowStoreDropdown(false);
                                setStoreSearch('');
                              }}
                              className={`px-4 py-2 cursor-pointer transition-all ${
                                formData.store_id === store.id
                                  ? 'bg-purple-500/30 text-white'
                                  : 'text-purple-200 hover:bg-purple-500/10'
                              }`}
                            >
                              {store.store_name}
                            </div>
                          ))}
                        {stores.filter(store => store.store_name.toLowerCase().includes(storeSearch.toLowerCase())).length === 0 && (
                          <p className="text-purple-400/60 text-xs text-center py-3">لا توجد نتائج</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-purple-300 text-sm mb-1">عنوان المهمة *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-transparent border border-purple-500/30 text-white rounded-xl outline-none focus:border-purple-400"
                  placeholder="عنوان المهمة"
                />
              </div>

              <div>
                <label className="block text-purple-300 text-sm mb-1">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-transparent border border-purple-500/30 text-white rounded-xl outline-none focus:border-purple-400 resize-none"
                  rows={3}
                  placeholder="وصف المهمة..."
                />
              </div>

              {/* المكلفين */}
              <div>
                <label className="block text-purple-300 text-sm mb-2">المكلف</label>
                
                {/* نوع التكليف */}
                <select
                  value={assignType}
                  onChange={(e) => {
                    const value = e.target.value as 'all' | 'employee' | 'team';
                    setAssignType(value);
                    if (value === 'all') {
                      setFormData({ ...formData, assign_to_all: true, assigned_to: [], assigned_roles: [] });
                    } else {
                      setFormData({ ...formData, assign_to_all: false, assigned_to: [], assigned_roles: [] });
                    }
                  }}
                  className="w-full px-4 py-2 bg-transparent border border-purple-500/30 text-white rounded-xl outline-none focus:border-purple-400 mb-3 [&>option]:bg-purple-950 [&>option]:text-white"
                >
                  <option value="all">تكليف الكل</option>
                  <option value="employee">تكليف موظف</option>
                  <option value="team">تكليف فريق</option>
                </select>

                {/* عرض خيارات الفريق فقط عند اختيار "تكليف فريق" */}
                {assignType === 'team' && (
                  <div>
                    <label className="block text-purple-400 text-xs mb-1">اختر الفريق</label>
                    <select
                      value={formData.assigned_roles[0] || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, assigned_roles: e.target.value ? [e.target.value] : [] });
                      }}
                      className="w-full px-4 py-2 bg-transparent border border-purple-500/30 text-white rounded-xl outline-none focus:border-purple-400 [&>option]:bg-purple-950 [&>option]:text-white"
                    >
                      <option value="">اختر فريق...</option>
                      {ROLES.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* عرض قائمة الموظفين فقط عند اختيار "تكليف موظف" */}
                {assignType === 'employee' && (
                  <div>
                    <label className="block text-purple-400 text-xs mb-1">اختر الموظفين</label>
                    <div className="max-h-32 overflow-y-auto bg-purple-900/20 rounded-lg border border-purple-500/20 p-2">
                      {users.map(user => (
                        <label key={user.id} className="flex items-center gap-2 p-1.5 hover:bg-purple-500/10 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.assigned_to.includes(user.id)}
                            onChange={(e) => {
                              const newAssigned = e.target.checked
                                ? [...formData.assigned_to, user.id]
                                : formData.assigned_to.filter(id => id !== user.id);
                              setFormData({ ...formData, assigned_to: newAssigned });
                            }}
                            className="w-4 h-4 rounded bg-purple-900/50 border-purple-500/50 text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-purple-200 text-sm">{user.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-purple-300 text-sm mb-1">الأولوية</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 bg-transparent border border-purple-500/30 text-white rounded-xl outline-none focus:border-purple-400 [&>option]:bg-purple-950 [&>option]:text-white"
                  >
                    {Object.entries(priorityLabels).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-purple-300 text-sm mb-1">
                    {useDatePicker ? 'تاريخ التسليم' : 'مدة التسليم (بالأيام)'}
                  </label>
                  {useDatePicker ? (
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="w-full px-4 py-2 bg-transparent border border-purple-500/30 text-white rounded-xl outline-none focus:border-purple-400"
                      dir="ltr"
                    />
                  ) : (
                    <input
                      type="number"
                      min="1"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      placeholder="عدد الأيام"
                      className="w-full px-4 py-2 bg-transparent border border-purple-500/30 text-white rounded-xl outline-none focus:border-purple-400"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setUseDatePicker(!useDatePicker);
                      setFormData({ ...formData, due_date: '' });
                    }}
                    className="text-purple-400 text-xs mt-1 hover:text-purple-300 flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {useDatePicker ? 'تسليم بعدد الأيام' : 'تسليم بتاريخ'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateTask}
                disabled={saving}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl transition-all disabled:opacity-50"
              >
                {saving ? 'جاري الإنشاء...' : 'إنشاء المهمة'}
              </button>
              <button
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="flex-1 py-3 bg-purple-900/50 text-white rounded-xl transition-all hover:bg-purple-900/70"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-purple-950/90 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">تعديل المهمة</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-purple-300 text-sm mb-1">عنوان المهمة</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-purple-300 text-sm mb-1">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl outline-none focus:border-purple-400 resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-purple-300 text-sm mb-1">المكلف (تحويل)</label>
                  <select
                    value={formData.assigned_to[0] || ''}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value ? [e.target.value] : [] })}
                    className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl outline-none focus:border-purple-400"
                  >
                    <option value="">غير محدد</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-purple-300 text-sm mb-1">الأولوية</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl outline-none focus:border-purple-400"
                  >
                    {Object.entries(priorityLabels).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-purple-300 text-sm mb-1">موعد التسليم</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl outline-none focus:border-purple-400"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateTask}
                disabled={saving}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl transition-all disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
              <button
                onClick={() => { setShowEditModal(false); setSelectedTask(null); resetForm(); }}
                className="flex-1 py-3 bg-purple-900/50 text-white rounded-xl transition-all hover:bg-purple-900/70"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipantsModal && selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-purple-950/90 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">المشاركون في المهمة</h3>

            {/* Current Participants */}
            <div className="space-y-2 mb-4">
              {participants.length === 0 ? (
                <p className="text-purple-300/60 text-center py-4">لا يوجد مشاركون</p>
              ) : (
                participants.map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-purple-900/30 rounded-xl p-3 border border-purple-500/20">
                    <div className="w-10 h-10 rounded-full bg-purple-600/30 flex items-center justify-center text-white font-bold">
                      {p.user?.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{p.user?.name}</p>
                      <p className="text-sm text-purple-300/60">
                        {p.role === 'helper' ? 'مساعد' : p.role === 'reviewer' ? 'مراجع' : 'مراقب'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Participant */}
            <div className="border-t border-purple-500/20 pt-4">
              <label className="block text-purple-300 text-sm mb-2">إضافة مشارك</label>
              <div className="flex gap-2">
                <select
                  id="newParticipant"
                  className="flex-1 px-4 py-2 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl outline-none focus:border-purple-400"
                >
                  <option value="">اختر مستخدم...</option>
                  {users
                    .filter(u => !participants.some(p => p.user?.id === u.id))
                    .map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))
                  }
                </select>
                <button
                  onClick={() => {
                    const select = document.getElementById('newParticipant') as HTMLSelectElement;
                    if (select.value) handleAddParticipant(select.value);
                  }}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-all"
                >
                  إضافة
                </button>
              </div>
            </div>

            <button
              onClick={() => { setShowParticipantsModal(false); setSelectedTask(null); setParticipants([]); }}
              className="w-full mt-4 py-3 bg-purple-900/50 text-white rounded-xl transition-all hover:bg-purple-900/70"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StoreTasksPage() {
  return (
    <AdminAuth>
      <StoreTasksContent />
    </AdminAuth>
  );
}
