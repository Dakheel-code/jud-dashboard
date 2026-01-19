'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AdminAuth from '@/components/AdminAuth';

interface UserStats {
  total_stores: number;
  completed_stores: number;
  in_progress_stores: number;
  average_completion: number;
  total_tasks_completed: number;
  total_tasks: number;
}

interface Store {
  id: string;
  store_name: string;
  store_url: string;
  owner_name: string;
  owner_phone: string;
  completion_percentage: number;
  completed_tasks: number;
  total_tasks: number;
  created_at: string;
}

interface UserData {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string;
}

const ROLE_NAMES: Record<string, string> = {
  super_admin: 'المسؤول الرئيسي',
  admin: 'المسؤول',
  team_leader: 'قائد فريق',
  account_manager: 'مدير حساب',
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-500/20 text-red-300 border-red-500/30',
  admin: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  team_leader: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  account_manager: 'bg-green-500/20 text-green-300 border-green-500/30',
};

function UserDetailsContent() {
  const params = useParams();
  const userId = params.id as string;
  
  const [user, setUser] = useState<UserData | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
        setStores(data.stores || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    } finally {
      setLoading(false);
    }
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

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0118]">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">المستخدم غير موجود</p>
          <Link href="/admin/users" className="text-purple-400 hover:text-purple-300">
            العودة لقائمة المستخدمين
          </Link>
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
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-fuchsia-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              {user.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl text-white font-semibold">{user.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-purple-400">@{user.username}</span>
                <span className={`px-3 py-1 rounded-full text-xs border ${ROLE_COLORS[user.role] || 'bg-gray-500/20 text-gray-300'}`}>
                  {ROLE_NAMES[user.role] || user.role}
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/admin/users"
            className="p-3 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-xl transition-all"
            title="العودة"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
              <h3 className="text-xs font-medium text-purple-300/80 mb-1">إجمالي المتاجر</h3>
              <p className="text-2xl font-bold text-white">{stats.total_stores}</p>
            </div>
            <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
              <h3 className="text-xs font-medium text-purple-300/80 mb-1">متاجر مكتملة</h3>
              <p className="text-2xl font-bold text-green-400">{stats.completed_stores}</p>
            </div>
            <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
              <h3 className="text-xs font-medium text-purple-300/80 mb-1">قيد التنفيذ</h3>
              <p className="text-2xl font-bold text-yellow-400">{stats.in_progress_stores}</p>
            </div>
            <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
              <h3 className="text-xs font-medium text-purple-300/80 mb-1">متوسط الإنجاز</h3>
              <p className="text-2xl font-bold text-blue-400">{stats.average_completion}%</p>
            </div>
            <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
              <h3 className="text-xs font-medium text-purple-300/80 mb-1">المهام المنجزة</h3>
              <p className="text-2xl font-bold text-fuchsia-400">{stats.total_tasks_completed}</p>
            </div>
            <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-4 border border-purple-500/20">
              <h3 className="text-xs font-medium text-purple-300/80 mb-1">إجمالي المهام</h3>
              <p className="text-2xl font-bold text-purple-400">{stats.total_tasks}</p>
            </div>
          </div>
        )}

        {/* User Info Card */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">معلومات المستخدم</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-purple-400/60 text-sm">البريد الإلكتروني</p>
              <p className="text-white">{user.email || '-'}</p>
            </div>
            <div>
              <p className="text-purple-400/60 text-sm">الحالة</p>
              <span className={`inline-block px-2 py-1 rounded text-xs ${user.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                {user.is_active ? 'نشط' : 'معطل'}
              </span>
            </div>
            <div>
              <p className="text-purple-400/60 text-sm">تاريخ الإنشاء</p>
              <p className="text-white">{new Date(user.created_at).toLocaleDateString('ar-SA')}</p>
            </div>
            <div>
              <p className="text-purple-400/60 text-sm">آخر دخول</p>
              <p className="text-white">{user.last_login ? new Date(user.last_login).toLocaleDateString('ar-SA') : 'لم يسجل دخول'}</p>
            </div>
          </div>
        </div>

        {/* Assigned Stores */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
          <div className="px-6 py-4 border-b border-purple-500/20">
            <h2 className="text-lg font-semibold text-white">المتاجر المسندة ({stores.length})</h2>
          </div>

          {stores.length === 0 ? (
            <div className="p-8 text-center text-purple-400/60">
              لا توجد متاجر مسندة لهذا المستخدم
            </div>
          ) : (
            <div className="divide-y divide-purple-500/20">
              {stores.map((store) => (
                <div key={store.id} className="p-4 hover:bg-purple-900/20 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <a 
                          href={`https://${store.store_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white font-medium hover:text-fuchsia-400 transition-colors"
                        >
                          {store.store_name || store.store_url}
                        </a>
                        <svg className="w-3 h-3 text-purple-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                      <p className="text-purple-400/60 text-sm mt-1">
                        {store.owner_name && store.owner_name !== '-' ? `${store.owner_name} • ` : ''}
                        {store.owner_phone || ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-purple-400/60 text-xs">المهام</p>
                        <p className="text-white font-medium">{store.completed_tasks}/{store.total_tasks}</p>
                      </div>
                      <div className="w-32">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-purple-950/50 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                store.completion_percentage === 100 
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                  : 'bg-gradient-to-r from-purple-500 to-fuchsia-500'
                              }`}
                              style={{ width: `${store.completion_percentage}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium w-10 text-left ${
                            store.completion_percentage === 100 ? 'text-green-400' : 'text-purple-200'
                          }`}>
                            {store.completion_percentage}%
                          </span>
                        </div>
                      </div>
                      <Link
                        href={`/admin/store/${encodeURIComponent(store.store_url)}`}
                        className="p-2 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-lg transition-all"
                        title="عرض التفاصيل"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default function UserDetailsPage() {
  return (
    <AdminAuth>
      <UserDetailsContent />
    </AdminAuth>
  );
}
