'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [storeUrl, setStoreUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const extractDomain = (url: string): string => {
    try {
      let cleanUrl = url.trim().toLowerCase();
      
      // إزالة البروتوكول
      cleanUrl = cleanUrl.replace(/^https?:\/\//, '');
      
      // إزالة www.
      cleanUrl = cleanUrl.replace(/^www\./, '');
      
      // إزالة أي مسار أو query parameters
      cleanUrl = cleanUrl.split('/')[0].split('?')[0];
      
      return cleanUrl;
    } catch {
      return url.trim().toLowerCase();
    }
  };

  const normalizeUrl = (url: string): string => {
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    return normalized;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const domain = extractDomain(storeUrl);
      const normalizedUrl = normalizeUrl(storeUrl);
      
      const response = await fetch('/api/store/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_url: domain }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.details 
          ? `${data.error}\n${data.details}`
          : data.error || 'حدث خطأ أثناء تسجيل الدخول';
        setError(errorMessage);
        setLoading(false);
        return;
      }

      localStorage.setItem('store_id', data.store_id);
      localStorage.setItem('store_url', domain);
      router.push('/tasks');
    } catch (err) {
      console.error('Connection error:', err);
      setError('حدث خطأ في الاتصال. تأكد من تشغيل السيرفر وإعداد Supabase بشكل صحيح.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0118] relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl bottom-0 right-1/3 animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* Floating particles */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/40 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-900/50 p-8 border border-purple-500/20 relative overflow-visible">
            {/* Ramadan Crescent - Right Side */}
            <div className="absolute -top-8 -right-8 w-24 h-24 sm:-top-12 sm:-right-12 sm:w-36 sm:h-36 z-50">
              <div className="relative w-full h-full">
                {/* White Glow - Lighter */}
                <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl animate-pulse"></div>
                
                <img 
                  src="/ramadan.png"
                  alt="Ramadan Crescent"
                  className="relative z-10 w-full h-full object-contain brightness-0 invert"
                  style={{ filter: 'brightness(0) invert(1) drop-shadow(0 0 10px rgba(255, 255, 255, 0.5)) drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))' }}
                />
              </div>
            </div>

            {/* Hanging Lanterns - Left Side */}
            <div className="absolute top-0 left-2 w-20 sm:left-4 sm:w-32 z-50">
              <div className="flex flex-row gap-1 items-start">
                {/* Lantern 1 - Smaller */}
            <div className="relative w-10 h-12 sm:w-14 sm:h-16">
                  <div className="absolute inset-0 bg-yellow-400/30 blur-xl animate-pulse"></div>
                  <svg viewBox="0 0 100 160" className="relative z-10 w-full h-full">
                    <defs>
                      <linearGradient id="lanternGold1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#fbbf24', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
                      </linearGradient>
                      <radialGradient id="lanternLight1">
                        <stop offset="0%" style={{ stopColor: '#fef3c7', stopOpacity: 0.9 }} />
                        <stop offset="100%" style={{ stopColor: '#fcd34d', stopOpacity: 0.3 }} />
                      </radialGradient>
                    </defs>
                    {/* Chain - Longer */}
                    <line x1="50" y1="0" x2="50" y2="30" stroke="#d97706" strokeWidth="1.5"/>
                    {/* Top Cap */}
                    <path d="M 40 30 L 50 25 L 60 30 Z" fill="url(#lanternGold1)"/>
                    {/* Lantern Body */}
                    <ellipse cx="50" cy="45" rx="18" ry="8" fill="url(#lanternGold1)"/>
                    <rect x="32" y="45" width="36" height="40" fill="url(#lanternGold1)" rx="2"/>
                    <ellipse cx="50" cy="85" rx="18" ry="8" fill="#d97706"/>
                    {/* Light Glow */}
                    <ellipse cx="50" cy="65" rx="15" ry="25" fill="url(#lanternLight1)"/>
                    {/* Bottom */}
                    <path d="M 45 90 L 50 100 L 55 90 Z" fill="#d97706"/>
                  </svg>
                </div>

                {/* Lantern 2 - Bigger and Taller */}
                <div className="relative w-12 h-16 sm:w-16 sm:h-24" style={{ animationDelay: '0.5s' }}>
                  <div className="absolute inset-0 bg-amber-400/30 blur-xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <svg viewBox="0 0 100 180" className="relative z-10 w-full h-full">
                    <defs>
                      <linearGradient id="lanternGold2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#fbbf24', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
                      </linearGradient>
                      <radialGradient id="lanternLight2">
                        <stop offset="0%" style={{ stopColor: '#fef3c7', stopOpacity: 0.9 }} />
                        <stop offset="100%" style={{ stopColor: '#fcd34d', stopOpacity: 0.3 }} />
                      </radialGradient>
                    </defs>
                    {/* Chain - Longer */}
                    <line x1="50" y1="0" x2="50" y2="35" stroke="#d97706" strokeWidth="1.5"/>
                    <path d="M 40 35 L 50 30 L 60 35 Z" fill="url(#lanternGold2)"/>
                    <ellipse cx="50" cy="50" rx="18" ry="8" fill="url(#lanternGold2)"/>
                    <rect x="32" y="50" width="36" height="45" fill="url(#lanternGold2)" rx="2"/>
                    <ellipse cx="50" cy="95" rx="18" ry="8" fill="#d97706"/>
                    <ellipse cx="50" cy="72" rx="15" ry="28" fill="url(#lanternLight2)"/>
                    <path d="M 45 100 L 50 110 L 55 100 Z" fill="#d97706"/>
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 mb-2 relative">
                {/* Glow effect for logo */}
                <div className="absolute inset-0 bg-purple-400/30 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute inset-4 bg-violet-400/20 rounded-full blur-xl"></div>
                
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="relative z-10 w-full h-full object-contain"
                  style={{ filter: 'drop-shadow(0 0 15px rgba(167, 139, 250, 0.6)) drop-shadow(0 0 30px rgba(139, 92, 246, 0.4))' }}
                />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                <span className="text-white">لوحة مهام </span>
                <span 
                  className="bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent"
                  style={{ 
                    filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.4)) drop-shadow(0 0 12px rgba(245, 158, 11, 0.2))'
                  }}
                >
                  المعسكر
                </span>
              </h1>
              <p className="text-purple-300/80 text-sm">
                خلّك جاهز للموسم 🚀
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="store_url"
                  className="block text-sm font-semibold text-white mb-2"
                >
                  رابط المتجر
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <input
                    id="store_url"
                    type="text"
                    value={storeUrl}
                    onChange={(e) => setStoreUrl(e.target.value)}
                    placeholder="mystore.com"
                    required
                    className="w-full px-4 py-3.5 pr-11 bg-purple-900/30 border-2 border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none transition-all text-right placeholder:text-purple-400/50"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-900/30 border-2 border-red-500/30 rounded-xl overflow-hidden backdrop-blur-sm">
                  <div className="text-red-300 px-4 py-3 text-sm flex items-start gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="whitespace-pre-line flex-1">{error}</div>
                  </div>
                  {error.includes('قاعدة البيانات') && (
                    <div className="bg-red-900/50 px-4 py-2 border-t border-red-500/30">
                      <a 
                        href="/setup" 
                        className="text-xs text-red-200 hover:text-white font-medium flex items-center gap-1 group"
                      >
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        اتبع دليل الإعداد الكامل
                      </a>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !storeUrl}
                className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white py-3.5 rounded-xl font-semibold hover:from-purple-700 hover:to-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-purple-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/50"
              >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جاري التحميل...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  دخول
                </span>
              )}
            </button>
          </form>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          50% {
            transform: translateY(-100vh) translateX(50px);
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
}
