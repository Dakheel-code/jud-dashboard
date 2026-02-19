'use client';

import { useEffect, useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const Modal = dynamic(() => import('@/components/ui/Modal'), { ssr: false });
import { useBranding } from '@/contexts/BrandingContext';

interface AdminUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: string;
  roles: string[];
  permissions: string[];
  is_active: boolean;
  last_login?: string;
  created_at: string;
  avatar?: string;
  provider?: string;
}

const ROLES = [
  { value: 'super_admin', label: 'المسؤول الرئيسي', color: 'red' },
  { value: 'manager', label: 'مدير', color: 'orange' },
  { value: 'editor', label: 'محرر', color: 'blue' },
  { value: 'viewer', label: 'مشاهد', color: 'cyan' },
  { value: 'employee', label: 'موظف', color: 'green' },
  { value: 'admin', label: 'المسؤول', color: 'purple' },
  { value: 'team_leader', label: 'قائد فريق', color: 'yellow' },
  { value: 'account_manager', label: 'مدير حساب', color: 'pink' },
  { value: 'media_buyer', label: 'ميديا باير', color: 'indigo' },
];

const PERMISSIONS = [
  { value: 'dashboard.read', label: 'عرض لوحة التحكم' },
  { value: 'users.read', label: 'عرض المستخدمين' },
  { value: 'users.write', label: 'تعديل المستخدمين' },
  { value: 'users.delete', label: 'حذف المستخدمين' },
  { value: 'roles.read', label: 'عرض الأدوار' },
  { value: 'roles.write', label: 'تعديل الأدوار' },
  { value: 'audit.read', label: 'عرض سجل التدقيق' },
  { value: 'settings.read', label: 'عرض الإعدادات' },
  { value: 'settings.write', label: 'تعديل الإعدادات' },
];

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (seconds < 60) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} د`;
  if (hours < 24) return `منذ ${hours} س`;
  if (days < 7) return `منذ ${days} يوم`;
  if (weeks < 4) return `منذ ${weeks} أسبوع`;
  return `منذ ${months} شهر`;
}

function UsersManagementContent() {
  const { branding } = useBranding();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalType, setResultModalType] = useState<'success' | 'error'>('success');
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  
  // نظام المكافآت
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [selectedUserForReward, setSelectedUserForReward] = useState<AdminUser | null>(null);
  const [rewardForm, setRewardForm] = useState({
    title: '',
    points: 0,
    description: '',
    type: 'recognition' as 'bonus' | 'achievement' | 'recognition'
  });
  const [submittingReward, setSubmittingReward] = useState(false);

  const REWARD_TYPES = [
    { value: 'bonus', label: 'مكافأة مالية', icon: '💰', color: 'green' },
    { value: 'achievement', label: 'إنجاز', icon: '🏆', color: 'yellow' },
    { value: 'recognition', label: 'تقدير', icon: '⭐', color: 'purple' },
  ];

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    roles: ['account_manager'] as string[],
    permissions: [] as string[],
  });

  // فلترة وبحث
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
    
    // تحديث تلقائي كل 10 ثواني لعرض حالة الاتصال بشكل لحظي
    const interval = setInterval(() => {
      fetchUsers();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // فلترة المستخدمين — useMemo لتجنب إعادة الحساب في كل render
  const filteredUsers = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return users.filter(user => {
      const matchesSearch = !q || 
        user.name.toLowerCase().includes(q) ||
        user.username.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q);
    
      const matchesRole = roleFilter === 'all' || 
        (user.roles || [user.role]).includes(roleFilter);
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);
    
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, debouncedSearch, roleFilter, statusFilter]);

  // إحصائيات — useMemo
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    byRole: ROLES.map(role => ({
      ...role,
      count: users.filter(u => (u.roles || [u.role]).includes(role.value)).length
    }))
  }), [users]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const openRewardModal = (user: AdminUser) => {
    setSelectedUserForReward(user);
    setRewardForm({ title: '', points: 0, description: '', type: 'recognition' });
    setShowRewardModal(true);
  };

  const submitReward = async () => {
    if (!selectedUserForReward || !rewardForm.title || rewardForm.points <= 0) return;
    
    setSubmittingReward(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUserForReward.id}/rewards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rewardForm)
      });
      
      if (response.ok) {
        setShowRewardModal(false);
        setSelectedUserForReward(null);
        setRewardForm({ title: '', points: 0, description: '', type: 'recognition' });
        setResultModalType('success');
        setResultModalMessage(`تم منح المكافأة لـ ${selectedUserForReward.name} بنجاح!`);
        setShowResultModal(true);
      } else {
        setResultModalType('error');
        setResultModalMessage('فشل في منح المكافأة');
        setShowResultModal(true);
      }
    } catch (err) {
      setResultModalType('error');
      setResultModalMessage('حدث خطأ أثناء منح المكافأة');
      setShowResultModal(true);
    } finally {
      setSubmittingReward(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let response: Response;
      let data: any;

      if (editingUser) {
        // تحديث مستخدم موجود — PATCH /api/admin/users/[id]
        response = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        data = await response.json();

        if (response.ok && data.ok) {
          // تحديث الـ state محلياً فوراً بدل refetch كامل
          setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...data.user } : u));
          setResultModalType('success');
          setResultModalMessage('تم تحديث المستخدم بنجاح');
          setShowResultModal(true);
          setShowAddModal(false);
          setEditingUser(null);
          resetForm();
        } else {
          setResultModalType('error');
          setResultModalMessage(data.message || data.error || 'فشل في تحديث المستخدم');
          setShowResultModal(true);
        }
      } else {
        // إنشاء مستخدم جديد — POST /api/admin/users
        response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        data = await response.json();

        if (response.ok) {
          setResultModalType('success');
          setResultModalMessage('تم إضافة المستخدم بنجاح');
          setShowResultModal(true);
          setShowAddModal(false);
          resetForm();
          fetchUsers();
        } else {
          setResultModalType('error');
          setResultModalMessage(data.error + (data.detail ? ` — ${data.detail}` : ''));
          setShowResultModal(true);
        }
      }
    } catch (err) {
      setResultModalType('error');
      setResultModalMessage('حدث خطأ في الاتصال');
      setShowResultModal(true);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`/api/admin/users?id=${userToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setResultModalType('success');
        setResultModalMessage('تم حذف المستخدم بنجاح');
        setShowResultModal(true);
        fetchUsers();
      } else {
        const data = await response.json();
        setResultModalType('error');
        setResultModalMessage(data.error || 'فشل في حذف المستخدم');
        setShowResultModal(true);
      }
    } catch (err) {
      setResultModalType('error');
      setResultModalMessage('حدث خطأ في الاتصال');
      setShowResultModal(true);
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, is_active: !user.is_active }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (err) {
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      email: '',
      roles: ['account_manager'],
      permissions: [],
    });
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      name: user.name,
      email: user.email || '',
      roles: user.roles || (user.role ? [user.role] : ['account_manager']),
      permissions: user.permissions || [],
    });
    setShowAddModal(true);
  };

  const getRoleColor = (role: string) => {
    const roleObj = ROLES.find(r => r.value === role);
    switch (roleObj?.color) {
      case 'red': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'orange': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'blue': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'green': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'cyan': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'yellow': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'pink': return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      case 'indigo': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getRoleLabel = (role: string) => {
    return ROLES.find(r => r.value === role)?.label || role;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0118]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
          </div>
          <p className="text-purple-300">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden">

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src={branding.logo || '/logo.png'} alt={branding.companyName || 'Logo'} className="w-14 h-14 sm:w-20 sm:h-20 object-contain" />
            <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
            <div>
              <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>إدارة المستخدمين</h1>
              <p className="text-purple-300/70 text-xs sm:text-sm">إضافة وتعديل صلاحيات المستخدمين</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => {
                resetForm();
                setEditingUser(null);
                setShowAddModal(true);
              }}
              className="p-3 text-green-400 border border-green-500/30 hover:border-green-400/50 hover:bg-green-500/10 rounded-xl transition-all"
              title="إضافة مستخدم"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </button>
            <Link
              href="/admin"
              className="p-3 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-xl transition-all"
              title="العودة للوحة التحكم"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-purple-950/40  rounded-xl border border-purple-500/20 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-purple-400 text-xs">إجمالي المستخدمين</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-950/40  rounded-xl border border-green-500/20 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{stats.active}</p>
                <p className="text-green-400/70 text-xs">نشط</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-950/40  rounded-xl border border-red-500/20 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{stats.inactive}</p>
                <p className="text-red-400/70 text-xs">معطل</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-950/40  rounded-xl border border-cyan-500/20 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-cyan-400">{ROLES.length}</p>
                <p className="text-cyan-400/70 text-xs">أدوار متاحة</p>
              </div>
            </div>
          </div>
        </div>

        {/* فلترة وبحث */}
        <div className="bg-purple-950/40  rounded-2xl border border-purple-500/20 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* بحث */}
            <div className="flex-1">
              <div className="relative">
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="بحث بالاسم أو اسم المستخدم أو البريد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400"
                />
              </div>
            </div>

            {/* فلتر الدور */}
            <div className="w-full lg:w-48">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400 [&>option]:bg-[#1a0a2e]"
              >
                <option value="all">جميع الأدوار</option>
                {ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>

            {/* فلتر الحالة */}
            <div className="w-full lg:w-40">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400 [&>option]:bg-[#1a0a2e]"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط</option>
                <option value="inactive">معطل</option>
              </select>
            </div>

            {/* زر إعادة التعيين */}
            {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                }}
                className="px-4 py-3 text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 rounded-xl transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="hidden sm:inline">إعادة تعيين</span>
              </button>
            )}
          </div>

          {/* عدد النتائج */}
          <div className="mt-3 text-sm text-purple-400">
            عرض {filteredUsers.length} من {users.length} مستخدم
          </div>
        </div>

        {/* Mobile View - Cards */}
        <div className="lg:hidden space-y-4">
          {filteredUsers.length === 0 ? (
            <div className="bg-purple-950/40  rounded-2xl border border-purple-500/20 p-8 text-center text-purple-400">
              {users.length === 0 ? 'لا يوجد مستخدمين' : 'لا توجد نتائج مطابقة للبحث'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="bg-purple-950/40  rounded-2xl border border-purple-500/20 p-4">
                <div className="flex justify-between items-start mb-3">
                  <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/30" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold">
                        {user.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div>
                      <p className="text-white font-medium hover:text-fuchsia-400 transition-colors flex items-center gap-2">
                        {user.name}
                        {user.provider === 'google' && (
                          <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          </svg>
                        )}
                      </p>
                      <p className="text-purple-400 text-sm">@{user.username}</p>
                      {user.email && <p className="text-purple-500 text-xs">{user.email}</p>}
                    </div>
                  </Link>
                  <div className="flex flex-wrap gap-1">
                    {(user.roles || [user.role]).map((role) => (
                      <span key={role} className={`px-2 py-0.5 rounded-full text-xs border ${getRoleColor(role)}`}>
                        {getRoleLabel(role)}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {(user.permissions || []).slice(0, 3).map((perm) => (
                    <span key={perm} className="px-2 py-0.5 bg-purple-800/30 text-purple-300 rounded text-xs">
                      {PERMISSIONS.find(p => p.value === perm)?.label || perm}
                    </span>
                  ))}
                  {(user.permissions || []).length > 3 && (
                    <span className="px-2 py-0.5 bg-purple-800/30 text-purple-400 rounded text-xs">
                      +{user.permissions.length - 3}
                    </span>
                  )}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`px-3 py-1 rounded-full text-xs ${
                        user.is_active
                          ? 'bg-green-500/20 text-green-300'
                          : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {user.is_active ? 'نشط' : 'معطل'}
                    </button>
                    <span className="text-purple-500 text-xs">
                      {user.last_login
                        ? timeAgo(user.last_login)
                        : 'لم يسجل دخول'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openRewardModal(user)}
                      className="p-2 text-green-400 border border-green-500/30 hover:border-green-400/50 hover:bg-green-500/10 rounded-lg transition-all"
                      title="منح مكافأة"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 text-blue-400 border border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-500/10 rounded-lg transition-all"
                      title="تعديل"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setUserToDelete(user);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 text-red-400 border border-red-500/30 hover:border-red-400/50 hover:bg-red-500/10 rounded-lg transition-all"
                      title="حذف"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden lg:block bg-purple-950/40  rounded-2xl border border-purple-500/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-500/20">
                  <th className="text-right text-purple-300 font-medium p-4">المستخدم</th>
                  <th className="text-right text-purple-300 font-medium p-4">الدور</th>
                  <th className="text-right text-purple-300 font-medium p-4">الصلاحيات</th>
                  <th className="text-right text-purple-300 font-medium p-4">الحالة</th>
                  <th className="text-right text-purple-300 font-medium p-4">متصل</th>
                  <th className="text-right text-purple-300 font-medium p-4">آخر اتصال</th>
                  <th className="text-right text-purple-300 font-medium p-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-purple-400 py-8">
                      {users.length === 0 ? 'لا يوجد مستخدمين' : 'لا توجد نتائج مطابقة للبحث'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-purple-500/10 hover:bg-purple-900/20">
                      <td className="p-4">
                        <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/30" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold">
                              {user.name?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium hover:text-fuchsia-400 transition-colors flex items-center gap-2">
                              {user.name}
                              {user.provider === 'google' && (
                                <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24">
                                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                </svg>
                              )}
                            </p>
                            <p className="text-purple-400 text-sm">@{user.username}</p>
                            {user.email && <p className="text-purple-500 text-xs">{user.email}</p>}
                          </div>
                        </Link>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(user.roles || [user.role]).map((role) => (
                            <span key={role} className={`px-2 py-0.5 rounded-full text-xs border ${getRoleColor(role)}`}>
                              {getRoleLabel(role)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(user.permissions || []).slice(0, 2).map((perm) => (
                            <span key={perm} className="px-2 py-0.5 bg-purple-800/30 text-purple-300 rounded text-xs">
                              {PERMISSIONS.find(p => p.value === perm)?.label || perm}
                            </span>
                          ))}
                          {(user.permissions || []).length > 2 && (
                            <span className="px-2 py-0.5 bg-purple-800/30 text-purple-400 rounded text-xs">
                              +{user.permissions.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`px-3 py-1 rounded-full text-xs ${
                            user.is_active
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {user.is_active ? 'نشط' : 'معطل'}
                        </button>
                      </td>
                      <td className="p-4">
                        {user.last_login && (Date.now() - new Date(user.last_login).getTime()) < 5 * 60 * 1000 ? (
                          <span className="inline-block w-3 h-3 bg-green-400 rounded-full animate-pulse" title="متصل الآن"></span>
                        ) : (
                          <span className="inline-block w-3 h-3 bg-red-500 rounded-full" title="غير متصل"></span>
                        )}
                      </td>
                      <td className="p-4 text-purple-400 text-sm">
                        {user.last_login
                          ? timeAgo(user.last_login)
                          : 'لم يسجل دخول'}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openRewardModal(user)}
                            className="p-2 text-green-400 border border-green-500/30 hover:border-green-400/50 hover:bg-green-500/10 rounded-lg transition-all"
                            title="منح مكافأة"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                            </svg>
                          </button>
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="p-2 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-lg transition-all"
                            title="عرض التفاصيل"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-blue-400 border border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-500/10 rounded-lg transition-all"
                            title="تعديل"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setUserToDelete(user);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-red-400 border border-red-500/30 hover:border-red-400/50 hover:bg-red-500/10 rounded-lg transition-all"
                            title="حذف"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-purple-950/95  rounded-2xl p-6 max-w-lg w-full border border-purple-500/30 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-6">
              {editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-purple-300 text-sm mb-2">اسم المستخدم</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                    required
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-purple-300 text-sm mb-2">
                    كلمة المرور {editingUser && '(اتركها فارغة للإبقاء)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                    required={!editingUser}
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-purple-300 text-sm mb-2">الاسم الكامل</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-purple-300 text-sm mb-2">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-purple-300 text-sm mb-2">الأدوار</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((role) => (
                    <label 
                      key={role.value} 
                      className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all border ${
                        formData.roles.includes(role.value)
                          ? `${getRoleColor(role.value)} border-opacity-100`
                          : 'bg-purple-900/20 border-purple-500/20 hover:bg-purple-900/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.roles.includes(role.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, roles: [...formData.roles, role.value] });
                          } else {
                            const newRoles = formData.roles.filter(r => r !== role.value);
                            setFormData({ ...formData, roles: newRoles.length > 0 ? newRoles : ['account_manager'] });
                          }
                        }}
                        className="w-4 h-4 rounded border-purple-500 text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-white text-sm">{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-purple-300 text-sm mb-2">الصلاحيات</label>
                <div className="grid grid-cols-2 gap-2">
                  {PERMISSIONS.map((perm) => (
                    <label key={perm.value} className="flex items-center gap-2 p-2 bg-purple-900/20 rounded-lg cursor-pointer hover:bg-purple-900/30">
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(perm.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, permissions: [...formData.permissions, perm.value] });
                          } else {
                            setFormData({ ...formData, permissions: formData.permissions.filter(p => p !== perm.value) });
                          }
                        }}
                        className="w-4 h-4 rounded border-purple-500 text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-white text-sm">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-fuchsia-600 transition-all"
                >
                  {editingUser ? 'حفظ التغييرات' : 'إضافة المستخدم'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  className="flex-1 py-3 bg-purple-900/50 text-white font-medium rounded-xl hover:bg-purple-900/70 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="حذف المستخدم"
        message={`هل أنت متأكد من حذف المستخدم "${userToDelete?.name}"؟`}
        onConfirm={handleDelete}
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

      {/* Reward Modal */}
      {showRewardModal && selectedUserForReward && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">منح مكافأة</h3>
                <p className="text-purple-400 text-sm mt-1">لـ {selectedUserForReward.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowRewardModal(false);
                  setSelectedUserForReward(null);
                }}
                className="text-purple-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Reward Type */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">نوع المكافأة</label>
                <div className="grid grid-cols-3 gap-2">
                  {REWARD_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setRewardForm({ ...rewardForm, type: type.value as 'bonus' | 'achievement' | 'recognition' })}
                      className={`p-3 rounded-xl border transition-all text-center ${
                        rewardForm.type === type.value
                          ? type.color === 'green' ? 'bg-green-500/30 border-green-500/50 text-green-400' :
                            type.color === 'yellow' ? 'bg-yellow-500/30 border-yellow-500/50 text-yellow-400' :
                            'bg-purple-500/30 border-purple-500/50 text-purple-400'
                          : 'bg-purple-900/30 border-purple-500/20 text-purple-300 hover:bg-purple-900/50'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{type.icon}</span>
                      <span className="text-xs">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">عنوان المكافأة</label>
                <input
                  type="text"
                  value={rewardForm.title}
                  onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                  placeholder="مثال: إنجاز متميز في المشروع"
                />
              </div>

              {/* Points */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">النقاط</label>
                <input
                  type="number"
                  value={rewardForm.points}
                  onChange={(e) => setRewardForm({ ...rewardForm, points: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                  placeholder="0"
                  min="0"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">الوصف (اختياري)</label>
                <textarea
                  value={rewardForm.description}
                  onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400 resize-none"
                  placeholder="أضف وصف المكافأة..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={submitReward}
                  disabled={!rewardForm.title || rewardForm.points <= 0 || submittingReward}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:from-green-400 hover:to-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReward ? 'جاري المنح...' : 'منح المكافأة'}
                </button>
                <button
                  onClick={() => {
                    setShowRewardModal(false);
                    setSelectedUserForReward(null);
                  }}
                  className="px-6 py-3 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-500/10 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function UsersClient() {
  return <UsersManagementContent />;
}
