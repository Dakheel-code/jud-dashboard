'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'password'>('email');
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signIn('google', { callbackUrl: '/admin?sync=1' });
    } catch (err) {
      setError('حدث خطأ في تسجيل الدخول عبر Google');
      setGoogleLoading(false);
    }
  };

  const syncUserToLocalStorage = async () => {
    try {
      const response = await fetch('/api/me');
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          localStorage.setItem('admin_user', JSON.stringify(data.user));
          // تعيين الـ cookie أيضاً
          document.cookie = `admin_user=${encodeURIComponent(JSON.stringify(data.user))}; path=/; max-age=${60 * 60 * 24 * 7}`;
        }
      }
    } catch (err) {
      console.error('Error syncing user to localStorage:', err);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('الرجاء إدخال البريد الإلكتروني');
      return;
    }
    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('بيانات الدخول غير صحيحة');
      } else if (result?.ok) {
        await syncUserToLocalStorage();
        router.push('/admin');
      }
    } catch (err) {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#0a0118] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
      <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
      <div className="absolute w-64 h-64 bg-fuchsia-600/20 rounded-full blur-3xl bottom-0 right-1/4 animate-pulse"></div>

      <div className="relative w-full max-w-md">
        {/* Logo - نصف خارج المربع مع أنيميشن */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-14 z-10">
          <div className="relative w-28 h-28 group">
            {/* Outer glow ring */}
            <div className="absolute inset-[-4px] bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-500 rounded-full opacity-10 blur-[2px] animate-spin" style={{ animationDuration: '10s' }}></div>
            
            {/* Main circle */}
            <div className="relative w-full h-full bg-purple-950/90 backdrop-blur-xl rounded-full border-2 border-purple-500/30 flex items-center justify-center p-4">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-full h-full object-contain animate-[float_3s_ease-in-out_infinite]"
              />
            </div>
          </div>
        </div>
        
        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }
        `}</style>

        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-8 pt-20 border border-purple-500/20 shadow-2xl">
          {/* Title */}
          <h1 className="text-2xl text-white text-center mb-8 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>تسجيل الدخول</h1>

          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all text-right"
                  placeholder="name@domain.com :مثال"
                  dir="ltr"
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-purple-500/30"
              >
                التالي
              </button>
            </form>
          )}

          {/* Step 2: Password */}
          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Show email with edit button */}
              <div className="flex items-center gap-2 p-3 bg-purple-900/30 rounded-xl border border-purple-500/30">
                <button
                  type="button"
                  onClick={handleBack}
                  className="p-1.5 hover:bg-purple-500/20 rounded-lg transition-all"
                >
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <span className="flex-1 text-purple-200 text-sm" dir="ltr">{email}</span>
              </div>

              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-purple-900/30 border border-purple-500/30 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all text-right"
                  placeholder="كلمة المرور"
                  required
                  autoFocus
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
                className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
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
          )}

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-purple-500/30"></div>
            <span className="text-purple-400/60 text-sm">او</span>
            <div className="flex-1 h-px bg-purple-500/30"></div>
          </div>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full py-3.5 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <span>باستخدام Google</span>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-purple-400/50 text-xs">
            <span className="text-purple-300/70">وكالة جود</span> - جميع الحقوق محفوظة © 2026
          </p>
        </div>
      </div>
    </div>
  );
}
