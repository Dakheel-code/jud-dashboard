'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signIn('google', { callbackUrl: '/admin' });
    } catch (err) {
      setError('حدث خطأ في تسجيل الدخول عبر Google');
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('admin_token', data.token);
          localStorage.setItem('admin_user', JSON.stringify(data.user));
          router.push('/admin');
        } else {
          setError(data.error || 'خطأ في تسجيل الدخول');
        }
      } else if (result?.ok) {
        router.push('/admin');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const toggleEmailForm = () => {
    setShowEmailForm(!showEmailForm);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#0a0118] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
      <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
      <div className="absolute w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl bottom-0 right-1/4 animate-pulse"></div>

      <div className="relative w-full max-w-md">
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-purple-500/20 shadow-2xl">
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

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full py-3.5 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {googleLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-gray-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                جاري تسجيل الدخول...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                تسجيل الدخول عبر Google
              </>
            )}
          </button>
          <p className="text-purple-400/60 text-xs text-center mt-2 mb-6">متاح فقط لحسابات @jud.sa</p>

          {/* Email Login Toggle Button */}
          <button
            onClick={toggleEmailForm}
            className={`w-full py-3 border rounded-xl transition-all flex items-center justify-center gap-3 ${
              showEmailForm 
                ? 'bg-purple-600/20 border-purple-500/50 text-purple-300' 
                : 'bg-purple-900/30 border-purple-500/30 text-purple-400 hover:bg-purple-900/50 hover:border-purple-500/50 hover:text-purple-300'
            }`}
          >
            {/* Mail Icon */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>تسجيل الدخول عبر البريد الإلكتروني</span>
            {/* Chevron Icon */}
            <svg 
              className={`w-4 h-4 transition-transform duration-300 ${showEmailForm ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Email Login Form - Collapsible */}
          <div 
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              showEmailForm ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/20">
              <h3 className="text-purple-300 text-sm font-medium mb-4 text-center">تسجيل الدخول بالبريد</h3>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-purple-300 text-xs font-medium mb-1.5">
                    اسم المستخدم
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2.5 bg-purple-900/40 border border-purple-500/30 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all text-sm"
                    placeholder="أدخل اسم المستخدم"
                    required
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-purple-300 text-xs font-medium mb-1.5">
                    كلمة المرور
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-purple-900/40 border border-purple-500/30 rounded-lg text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all text-sm"
                    placeholder="أدخل كلمة المرور"
                    required
                    dir="rtl"
                  />
                </div>

                {error && (
                  <div className="p-2.5 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-xs text-center">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        جاري الدخول...
                      </span>
                    ) : (
                      'تسجيل الدخول'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={toggleEmailForm}
                    className="px-4 py-2.5 bg-purple-900/40 hover:bg-purple-900/60 text-purple-400 hover:text-purple-300 font-medium rounded-lg transition-all text-sm border border-purple-500/30"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-purple-400/50 text-xs">
              <span className="text-white">وكالة جود</span> - جميع الحقوق محفوظة © 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
