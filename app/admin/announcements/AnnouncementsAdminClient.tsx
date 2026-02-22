'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useBranding } from '@/contexts/BrandingContext';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'normal' | 'urgent' | 'scheduled';
  priority: 'low' | 'normal' | 'high' | 'critical';
  target_type: 'all' | 'department' | 'users';
  target_department_id: string | null;
  channels: string[];
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  send_at: string | null;
  sent_at: string | null;
  created_at: string;
  creator?: { id: string; name: string; avatar: string };
  target_users?: { user: { id: string; name: string } }[];
  reads?: { count: number }[];
}

interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  avatar?: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  normal: { label: 'عادي', color: 'bg-blue-500/20 text-blue-400' },
  urgent: { label: 'عاجل (نافذة Pop Up)', color: 'bg-red-500/20 text-red-400' },
  scheduled: { label: 'مجدول', color: 'bg-yellow-500/20 text-yellow-400' }
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'منخفضة', color: 'bg-gray-500/20 text-gray-400' },
  normal: { label: 'عادية', color: 'bg-blue-500/20 text-blue-400' },
  high: { label: 'عالية', color: 'bg-orange-500/20 text-orange-400' },
  critical: { label: 'حرجة', color: 'bg-red-500/20 text-red-400' }
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'مسودة', color: 'bg-gray-500/20 text-gray-400' },
  scheduled: { label: 'مجدول', color: 'bg-yellow-500/20 text-yellow-400' },
  sent: { label: 'مرسل', color: 'bg-green-500/20 text-green-400' },
  cancelled: { label: 'ملغي', color: 'bg-red-500/20 text-red-400' }
};

const TARGET_LABELS: Record<string, string> = {
  all: 'جميع الموظفين',
  department: 'قسم محدد',
  users: 'موظفين محددين'
};

function AnnouncementsContent() {
  const { branding } = useBranding();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  
  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'normal' as 'normal' | 'urgent' | 'scheduled',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'critical',
    target_type: 'all' as 'all' | 'department' | 'users',
    target_department_id: '',
    target_users: [] as string[],
    channels: ['in_app'] as string[],
    send_at: '',
    show_as_popup: false,
    conditions: [] as { field: string; operator: string; value: string }[]
  });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const userStr = localStorage.getItem('admin_user');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
    fetchAnnouncements();
    fetchUsers();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      if (filterStatus) params.append('status', filterStatus);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/admin/announcements?${params}`);
      const data = await response.json();
      setAnnouncements(data.announcements || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setAllUsers(data.users || []);
    } catch (error) {
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [filterType, filterStatus, searchQuery]);

  const resetForm = () => {
    setForm({
      title: '',
      content: '',
      type: 'normal',
      priority: 'normal',
      target_type: 'all',
      target_department_id: '',
      target_users: [],
      channels: ['in_app'],
      send_at: '',
      show_as_popup: false,
      conditions: []
    });
    setEditingAnnouncement(null);
  };

  const openModal = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setForm({
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        priority: announcement.priority,
        target_type: announcement.target_type,
        target_department_id: announcement.target_department_id || '',
        target_users: announcement.target_users?.map(t => t.user.id) || [],
        channels: announcement.channels || ['in_app'],
        send_at: announcement.send_at ? announcement.send_at.slice(0, 16) : '',
        show_as_popup: false,
        conditions: []
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleSave = async (status: 'draft' | 'sent' | 'scheduled') => {
    if (!form.title.trim() || !form.content.trim()) {
      alert('يرجى إدخال العنوان والمحتوى');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        status: form.type === 'scheduled' && form.send_at ? 'scheduled' : status,
        created_by: currentUser?.id,
        ...(editingAnnouncement && { id: editingAnnouncement.id })
      };

      const response = await fetch('/api/admin/announcements', {
        method: editingAnnouncement ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        setShowModal(false);
        resetForm();
        fetchAnnouncements();
      } else {
        alert(data.error || 'فشل في حفظ التعميم');
      }
    } catch (error) {
      alert('حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async (id: string) => {
    if (!confirm('هل أنت متأكد من إرسال هذا التعميم؟')) return;

    try {
      const response = await fetch(`/api/admin/announcements/${id}/send`, {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok) {
        showToast(data.message || 'تم إرسال التعميم بنجاح', 'success');
        fetchAnnouncements();
      } else {
        showToast(data.error || 'فشل في إرسال التعميم', 'error');
      }
    } catch (error) {
      showToast('حدث خطأ غير متوقع', 'error');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('هل أنت متأكد من إلغاء هذا التعميم؟')) return;

    try {
      const response = await fetch(`/api/admin/announcements/${id}/cancel`, {
        method: 'POST'
      });
      if (response.ok) {
        showToast('تم إلغاء التعميم', 'success');
        fetchAnnouncements();
      } else {
        showToast('فشل في إلغاء التعميم', 'error');
      }
    } catch (error) {
      showToast('حدث خطأ غير متوقع', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التعميم؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    try {
      const response = await fetch(`/api/admin/announcements?id=${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        showToast('تم حذف التعميم بنجاح', 'success');
        fetchAnnouncements();
      } else {
        showToast('فشل في حذف التعميم', 'error');
      }
    } catch (error) {
      alert('حدث خطأ');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-300 ${
          toast.type === 'success'
            ? 'bg-green-500/20 border-green-500/40 text-green-300'
            : 'bg-red-500/20 border-red-500/40 text-red-300'
        }`}>
          {toast.type === 'success' ? (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-medium text-sm">{toast.message}</span>
          <button onClick={() => setToast(null)} className="mr-2 opacity-60 hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
<div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src={branding.logo || '/logo.png'} alt={branding.companyName || 'Logo'} className="w-14 h-14 sm:w-20 sm:h-20 object-contain" />
            <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
            <div>
              <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>التعاميم</h1>
              <p className="text-purple-300/80 text-xs sm:text-sm">إدارة التعاميم والإشعارات للموظفين</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/admin" className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-300 rounded-xl border border-purple-500/30 hover:bg-purple-500/30 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
              لوحة التحكم
            </Link>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-medium rounded-xl hover:from-purple-400 hover:to-fuchsia-400 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              إنشاء تعميم جديد
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10  rounded-2xl p-4 border border-purple-500/20 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="بحث بالعنوان..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white placeholder-purple-400 focus:outline-none focus:border-purple-400"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
            >
              <option value="" className="bg-slate-900">جميع الأنواع</option>
              <option value="normal" className="bg-slate-900">عادي</option>
              <option value="urgent" className="bg-slate-900">عاجل (نافذة Pop Up)</option>
              <option value="scheduled" className="bg-slate-900">مجدول</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
            >
              <option value="" className="bg-slate-900">جميع الحالات</option>
              <option value="draft" className="bg-slate-900">مسودة</option>
              <option value="scheduled" className="bg-slate-900">مجدول</option>
              <option value="sent" className="bg-slate-900">مرسل</option>
              <option value="cancelled" className="bg-slate-900">ملغي</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10  rounded-2xl p-4 border border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-blue-400/80 text-xs sm:text-sm">إجمالي التعاميم</p>
                <p className="text-2xl font-bold text-blue-400">{announcements.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10  rounded-2xl p-4 border border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-green-400/80 text-xs sm:text-sm">مرسلة</p>
                <p className="text-2xl font-bold text-green-400">{announcements.filter(a => a.status === 'sent').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10  rounded-2xl p-4 border border-yellow-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-yellow-400/80 text-xs sm:text-sm">مجدولة</p>
                <p className="text-2xl font-bold text-yellow-400">{announcements.filter(a => a.status === 'scheduled').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-500/10 to-rose-500/10  rounded-2xl p-4 border border-red-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-red-400/80 text-xs sm:text-sm">عاجلة</p>
                <p className="text-2xl font-bold text-red-400">{announcements.filter(a => a.type === 'urgent').length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Announcements Table */}
        <div className="bg-white/5  rounded-2xl border border-purple-500/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-500/20">
                  <th className="text-right p-4 text-purple-300 font-medium">العنوان</th>
                  <th className="text-right p-4 text-purple-300 font-medium">النوع</th>
                  <th className="text-right p-4 text-purple-300 font-medium">الاستهداف</th>
                  <th className="text-right p-4 text-purple-300 font-medium">الأولوية</th>
                  <th className="text-right p-4 text-purple-300 font-medium">الحالة</th>
                  <th className="text-right p-4 text-purple-300 font-medium">تاريخ الإنشاء</th>
                  <th className="text-right p-4 text-purple-300 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center text-purple-400 py-8">جاري التحميل...</td>
                  </tr>
                ) : announcements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-purple-400 py-8">لا توجد تعاميم</td>
                  </tr>
                ) : (
                  announcements.map((announcement) => (
                    <tr key={announcement.id} className="border-b border-purple-500/10 hover:bg-purple-900/20">
                      <td className="p-4">
                        <div>
                          <p className="text-white font-medium">{announcement.title}</p>
                          <p className="text-purple-400 text-sm truncate max-w-xs">{announcement.content}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${TYPE_LABELS[announcement.type]?.color || ''}`}>
                          {TYPE_LABELS[announcement.type]?.label || announcement.type}
                        </span>
                      </td>
                      <td className="p-4 text-purple-300 text-sm">
                        {TARGET_LABELS[announcement.target_type] || announcement.target_type}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${PRIORITY_LABELS[announcement.priority]?.color || ''}`}>
                          {PRIORITY_LABELS[announcement.priority]?.label || announcement.priority}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${STATUS_LABELS[announcement.status]?.color || ''}`}>
                          {STATUS_LABELS[announcement.status]?.label || announcement.status}
                        </span>
                      </td>
                      <td className="p-4 text-purple-300 text-sm">
                        {formatDate(announcement.created_at)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {announcement.status === 'draft' && (
                            <>
                              <button
                                onClick={() => handleSend(announcement.id)}
                                className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors"
                                title="إرسال"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                              </button>
                              <button
                                onClick={() => openModal(announcement)}
                                className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                                title="تعديل"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </>
                          )}
                          {announcement.status === 'scheduled' && (
                            <button
                              onClick={() => handleCancel(announcement.id)}
                              className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors"
                              title="إلغاء"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                          {announcement.status === 'sent' && (
                            <button
                              onClick={() => handleSend(announcement.id)}
                              className="p-2 text-cyan-400 hover:bg-cyan-500/20 rounded-lg transition-colors"
                              title="إعادة إرسال"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(announcement.id)}
                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
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

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-purple-500/20">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    {editingAnnouncement ? 'تعديل التعميم' : 'إنشاء تعميم جديد'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 text-purple-400 hover:bg-purple-500/20 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-purple-300 text-sm mb-2">العنوان *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-3 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                    placeholder="عنوان التعميم"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-purple-300 text-sm mb-2">المحتوى *</label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-3 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400 resize-none"
                    placeholder="محتوى التعميم..."
                  />
                </div>

                {/* Type & Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-purple-300 text-sm mb-2">النوع</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                      className="w-full px-4 py-3 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                    >
                      <option value="normal" className="bg-slate-900">عادي</option>
                      <option value="urgent" className="bg-slate-900">عاجل (نافذة Pop Up)</option>
                      <option value="scheduled" className="bg-slate-900">مجدول</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-purple-300 text-sm mb-2">الأولوية</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                      className="w-full px-4 py-3 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                    >
                      <option value="low" className="bg-slate-900">منخفضة</option>
                      <option value="normal" className="bg-slate-900">عادية</option>
                      <option value="high" className="bg-slate-900">عالية</option>
                      <option value="critical" className="bg-slate-900">حرجة</option>
                    </select>
                  </div>
                </div>

                {/* Target */}
                <div>
                  <label className="block text-purple-300 text-sm mb-2">الاستهداف</label>
                  <select
                    value={form.target_type}
                    onChange={(e) => setForm({ ...form, target_type: e.target.value as any })}
                    className="w-full px-4 py-3 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="all" className="bg-slate-900">جميع الموظفين</option>
                    <option value="department" className="bg-slate-900">قسم محدد</option>
                    <option value="users" className="bg-slate-900">موظفين محددين</option>
                  </select>
                </div>

                {/* Target Users */}
                {form.target_type === 'users' && (
                  <div>
                    <label className="block text-purple-300 text-sm mb-2">اختر الموظفين</label>
                    <div className="max-h-40 overflow-y-auto bg-purple-900/30 rounded-xl p-3 space-y-2">
                      {allUsers.map((user) => (
                        <label key={user.id} className="flex items-center gap-3 p-2 hover:bg-purple-500/10 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.target_users.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm({ ...form, target_users: [...form.target_users, user.id] });
                              } else {
                                setForm({ ...form, target_users: form.target_users.filter(id => id !== user.id) });
                              }
                            }}
                            className="w-4 h-4 rounded border-purple-500/30 bg-purple-900/50 text-purple-500 focus:ring-purple-500"
                          />
                          <span className="text-white">{user.name}</span>
                          <span className="text-purple-400 text-sm">@{user.username}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scheduled Time */}
                {form.type === 'scheduled' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-purple-300 text-sm mb-2">وقت الإرسال</label>
                      <input
                        type="datetime-local"
                        value={form.send_at}
                        onChange={(e) => setForm({ ...form, send_at: e.target.value })}
                        className="w-full px-4 py-3 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-3 cursor-pointer p-3 bg-purple-900/30 rounded-xl border border-purple-500/20 hover:bg-purple-900/50 transition-all">
                        <input
                          type="checkbox"
                          checked={form.show_as_popup}
                          onChange={(e) => setForm({ ...form, show_as_popup: e.target.checked })}
                          className="w-5 h-5 rounded border-purple-500/30 bg-purple-900/50 text-purple-500 focus:ring-purple-500"
                        />
                        <div>
                          <span className="text-white font-medium">إظهار كنافذة Pop Up</span>
                          <p className="text-purple-400 text-xs mt-0.5">عند تفعيل هذا الخيار، سيظهر التعميم كنافذة منبثقة للموظفين</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Channels */}
                <div>
                  <label className="block text-purple-300 text-sm mb-2">قنوات الإرسال</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.channels.includes('in_app')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, channels: [...form.channels, 'in_app'] });
                          } else {
                            setForm({ ...form, channels: form.channels.filter(c => c !== 'in_app') });
                          }
                        }}
                        className="w-4 h-4 rounded border-purple-500/30 bg-purple-900/50 text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-white">داخل التطبيق</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.channels.includes('slack')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, channels: [...form.channels, 'slack'] });
                          } else {
                            setForm({ ...form, channels: form.channels.filter(c => c !== 'slack') });
                          }
                        }}
                        className="w-4 h-4 rounded border-purple-500/30 bg-purple-900/50 text-purple-500 focus:ring-purple-500"
                      />
                      <svg className="w-4 h-4 text-[#4A154B]" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>
                      <span className="text-white">Slack</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.channels.includes('whatsapp')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({ ...form, channels: [...form.channels, 'whatsapp'] });
                          } else {
                            setForm({ ...form, channels: form.channels.filter(c => c !== 'whatsapp') });
                          }
                        }}
                        className="w-4 h-4 rounded border-purple-500/30 bg-purple-900/50 text-purple-500 focus:ring-purple-500"
                      />
                      <svg className="w-4 h-4 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      <span className="text-white">WhatsApp</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer opacity-50">
                      <input
                        type="checkbox"
                        disabled
                        className="w-4 h-4 rounded border-purple-500/30 bg-purple-900/50 text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-white">البريد الإلكتروني (قريباً)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-purple-500/20 flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-purple-500/20 text-purple-300 rounded-xl hover:bg-purple-500/30 transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                  className="px-6 py-2 bg-gray-500/20 text-gray-300 rounded-xl hover:bg-gray-500/30 transition-all disabled:opacity-50"
                >
                  حفظ كمسودة
                </button>
                {form.type === 'scheduled' && form.send_at ? (
                  <button
                    onClick={() => handleSave('scheduled')}
                    disabled={saving}
                    className="px-6 py-2 bg-yellow-500/20 text-yellow-300 rounded-xl hover:bg-yellow-500/30 transition-all disabled:opacity-50"
                  >
                    جدولة الإرسال
                  </button>
                ) : (
                  <button
                    onClick={() => handleSave('sent')}
                    disabled={saving}
                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-400 hover:to-emerald-400 transition-all disabled:opacity-50"
                  >
                    {saving ? 'جاري الإرسال...' : 'إرسال الآن'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnnouncementsAdminClient() {
  return <AnnouncementsContent />;
}
