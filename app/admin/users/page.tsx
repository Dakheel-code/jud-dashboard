'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';
import AdminAuth from '@/components/AdminAuth';

interface AdminUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  last_login?: string;
  created_at: string;
}

const ROLES = [
  { value: 'super_admin', label: 'المسؤول الرئيسي', color: 'red' },
  { value: 'admin', label: 'المسؤول', color: 'orange' },
  { value: 'team_leader', label: 'قائد فريق', color: 'blue' },
  { value: 'account_manager', label: 'مدير حساب', color: 'green' },
];

const PERMISSIONS = [
  { value: 'manage_tasks', label: 'إدارة المهام' },
  { value: 'manage_stores', label: 'إدارة المتاجر' },
  { value: 'manage_users', label: 'إدارة المستخدمين' },
  { value: 'manage_help', label: 'إدارة طلبات المساعدة' },
  { value: 'view_stats', label: 'عرض الإحصائيات' },
];

function UsersManagementContent() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalType, setResultModalType] = useState<'success' | 'error'>('success');
  const [resultModalMessage, setResultModalMessage] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'account_manager',
    permissions: [] as string[],
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';
      const body = editingUser 
        ? { id: editingUser.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setResultModalType('success');
        setResultModalMessage(editingUser ? 'تم تحديث المستخدم بنجاح' : 'تم إضافة المستخدم بنجاح');
        setShowResultModal(true);
        setShowAddModal(false);
        setEditingUser(null);
        resetForm();
        fetchUsers();
      } else {
        setResultModalType('error');
        setResultModalMessage(data.error || 'حدث خطأ');
        setShowResultModal(true);
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
      console.error('Failed to toggle user status:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      email: '',
      role: 'account_manager',
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
      role: user.role,
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
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src="/logo.png" alt="Logo" className="w-14 h-14 sm:w-20 sm:h-20 object-contain" />
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

        {/* Mobile View - Cards */}
        <div className="lg:hidden space-y-4">
          {users.length === 0 ? (
            <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 text-center text-purple-400">
              لا يوجد مستخدمين
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-4">
                <div className="flex justify-between items-start mb-3">
                  <Link href={`/admin/users/${user.id}`} className="hover:opacity-80 transition-opacity">
                    <p className="text-white font-medium hover:text-fuchsia-400 transition-colors">{user.name}</p>
                    <p className="text-purple-400 text-sm">@{user.username}</p>
                    {user.email && <p className="text-purple-500 text-xs">{user.email}</p>}
                  </Link>
                  <span className={`px-3 py-1 rounded-full text-xs border ${getRoleColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
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
                        ? new Date(user.last_login).toLocaleDateString('ar-SA')
                        : 'لم يسجل دخول'}
                    </span>
                  </div>
                  <div className="flex gap-2">
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
        <div className="hidden lg:block bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-purple-500/20">
                  <th className="text-right text-purple-300 font-medium p-4">المستخدم</th>
                  <th className="text-right text-purple-300 font-medium p-4">الدور</th>
                  <th className="text-right text-purple-300 font-medium p-4">الصلاحيات</th>
                  <th className="text-right text-purple-300 font-medium p-4">الحالة</th>
                  <th className="text-right text-purple-300 font-medium p-4">آخر دخول</th>
                  <th className="text-right text-purple-300 font-medium p-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-purple-400 py-8">
                      لا يوجد مستخدمين
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-purple-500/10 hover:bg-purple-900/20">
                      <td className="p-4">
                        <Link href={`/admin/users/${user.id}`} className="block hover:opacity-80 transition-opacity">
                          <p className="text-white font-medium hover:text-fuchsia-400 transition-colors">{user.name}</p>
                          <p className="text-purple-400 text-sm">@{user.username}</p>
                          {user.email && <p className="text-purple-500 text-xs">{user.email}</p>}
                        </Link>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs border ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
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
                      <td className="p-4 text-purple-400 text-sm">
                        {user.last_login
                          ? new Date(user.last_login).toLocaleDateString('ar-SA')
                          : 'لم يسجل دخول'}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
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
          <div className="relative bg-purple-950/95 backdrop-blur-xl rounded-2xl p-6 max-w-lg w-full border border-purple-500/30 shadow-2xl max-h-[90vh] overflow-y-auto">
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
                <label className="block text-purple-300 text-sm mb-2">الدور</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:border-purple-400"
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
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

    </div>
  );
}

export default function UsersManagementPage() {
  return (
    <AdminAuth>
      <UsersManagementContent />
    </AdminAuth>
  );
}
