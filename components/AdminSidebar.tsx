'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface UserInfo {
  id?: string;
  name: string;
  username?: string;
  email?: string;
  role: string;
  avatar?: string;
}

const ROLE_LABELS: Record<string, string> = {
  'super_admin': 'المسؤول الرئيسي',
  'admin': 'مسؤول',
  'team_leader': 'قائد فريق',
  'account_manager': 'مدير حساب',
};

interface MenuItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const menuItems: MenuItem[] = [
  {
    href: '/admin',
    label: 'لوحة التحكم',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/admin/stores',
    label: 'المتاجر',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: '/admin/tasks',
    label: 'المهام',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/admin/users',
    label: 'المستخدمين',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/clients',
    label: 'العملاء',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/settings',
    label: 'الإعدادات',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', currentPassword: '', newPassword: '', avatar: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('admin_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser({
          id: parsed.id,
          name: parsed.name || parsed.username || 'مستخدم',
          username: parsed.username,
          email: parsed.email,
          role: parsed.role || 'account_manager',
          avatar: parsed.avatar || null,
        });
        setProfileForm(prev => ({
          ...prev,
          name: parsed.name || '',
          email: parsed.email || '',
          phone: parsed.phone || '',
          avatar: parsed.avatar || ''
        }));
        if (parsed.avatar) {
          setAvatarPreview(parsed.avatar);
        }
      } catch {
        setUser({ name: 'مستخدم', role: 'account_manager' });
      }
    }
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setProfileError('حجم الصورة يجب أن يكون أقل من 2 ميجابايت');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatarPreview(base64);
        setProfileForm(prev => ({ ...prev, avatar: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async () => {
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user?.id,
          name: profileForm.name,
          email: profileForm.email,
          phone: profileForm.phone || undefined,
          avatar: profileForm.avatar || undefined,
          currentPassword: profileForm.currentPassword || undefined,
          newPassword: profileForm.newPassword || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setProfileSuccess('تم تحديث البيانات بنجاح');
        // Update local storage
        const storedUser = localStorage.getItem('admin_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          parsed.name = profileForm.name;
          parsed.email = profileForm.email;
          if (profileForm.avatar) {
            parsed.avatar = profileForm.avatar;
          }
          if (profileForm.phone) {
            parsed.phone = profileForm.phone;
          }
          localStorage.setItem('admin_user', JSON.stringify(parsed));
          setUser(prev => prev ? { ...prev, name: profileForm.name, email: profileForm.email, avatar: profileForm.avatar || prev.avatar } : null);
        }
        setProfileForm(prev => ({ ...prev, currentPassword: '', newPassword: '' }));
      } else {
        setProfileError(data.error || 'فشل تحديث البيانات');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setProfileError('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setProfileLoading(false);
    }
  };

  const checkActive = (href: string): boolean => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      router.push('/admin/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
    router.push(href);
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside 
        className={`
          fixed top-0 right-0 h-screen w-72 bg-[#0a0118] border-l border-purple-500/20 z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo Header */}
          <div className="p-6 border-b border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
                <div className="h-10 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
                <div>
                  <h2 className="text-white text-lg uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>{user?.name || 'مستخدم'}</h2>
                  <p className="text-purple-400/60 text-xs">{user?.role ? ROLE_LABELS[user.role] || user.role : 'لوحة التحكم'}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="lg:hidden p-2 text-purple-400 hover:bg-purple-500/10 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <nav className="flex-1 p-4 overflow-y-auto">
            {menuItems.map((item, index) => {
              const isActive = checkActive(item.href);
              return (
                <button
                  key={index}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 mb-1 rounded-xl transition-all text-right
                    ${isActive 
                      ? 'bg-gradient-to-r from-purple-600/30 to-fuchsia-600/30 text-white border border-purple-500/30' 
                      : 'text-purple-300 hover:bg-purple-500/10 hover:text-white border border-transparent'
                    }
                  `}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Profile & Logout - Fixed at Bottom */}
          <div className="mt-auto p-4 border-t border-purple-500/20 bg-[#0a0118]">
            {/* Profile Section */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-purple-900/30 hover:bg-purple-500/20 rounded-xl transition-all text-right border border-purple-500/20 mb-3"
            >
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-purple-500/30"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {user?.name?.charAt(0) || 'م'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white truncate uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>{user?.name || 'مستخدم'}</p>
                <p className="text-purple-400/60 text-xs truncate">{ROLE_LABELS[user?.role || ''] || 'مدير حساب'}</p>
              </div>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-red-500/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowProfileModal(false)}>
          <div 
            className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-purple-500/20">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">تعديل الملف الشخصي</h3>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Profile Picture */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="صورة الملف الشخصي" 
                      className="w-24 h-24 rounded-full object-cover border-4 border-purple-500/30"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-4xl">
                      {user?.name?.charAt(0) || 'م'}
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-lg">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-purple-400/60 text-xs mt-2">اضغط على الأيقونة لتغيير الصورة</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">الاسم</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  placeholder="أدخل اسمك"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  placeholder="example@email.com"
                  dir="ltr"
                  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">رقم الجوال</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
              </div>

              {/* Current Password */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">كلمة المرور الحالية (اختياري)</label>
                <input
                  type="password"
                  value={profileForm.currentPassword}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  placeholder="أدخل كلمة المرور الحالية"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm text-purple-300 mb-2">كلمة المرور الجديدة (اختياري)</label>
                <input
                  type="password"
                  value={profileForm.newPassword}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  placeholder="أدخل كلمة المرور الجديدة"
                />
              </div>

              {/* Error/Success Messages */}
              {profileError && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-xl text-green-400 text-sm">
                  {profileSuccess}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-purple-500/20 flex gap-3">
              <button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 px-4 py-3 border border-purple-500/30 text-purple-300 hover:bg-purple-500/10 rounded-xl transition-all font-medium"
              >
                إلغاء
              </button>
              <button
                onClick={handleProfileUpdate}
                disabled={profileLoading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-xl transition-all font-medium disabled:opacity-50"
              >
                {profileLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
