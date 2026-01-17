'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_user', username);
        router.push('/admin');
      } else {
        setError(data.error || 'خطأ في تسجيل الدخول');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0118] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
      <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
      <div className="absolute w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl bottom-0 right-1/4 animate-pulse"></div>

      <div className="relative w-full max-w-md">
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-3xl p-8 border border-purple-500/20 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4 relative">
              <div className="absolute inset-0 bg-purple-400/30 rounded-full blur-xl animate-pulse"></div>
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="relative z-10 w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl text-white mb-2 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>لوحة التحكم</h1>
            <p className="text-purple-300/70 text-sm">تسجيل دخول المسؤول</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-purple-300 text-sm font-medium mb-2">
                اسم المستخدم
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                placeholder="أدخل اسم المستخدم"
                required
                dir="rtl"
              />
            </div>

            <div>
              <label className="block text-purple-300 text-sm font-medium mb-2">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                placeholder="أدخل كلمة المرور"
                required
                dir="rtl"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  جاري تسجيل الدخول...
                </span>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-purple-400/50 text-xs">
              © 2026 <span className="text-white">معسكر الخير</span> - جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
