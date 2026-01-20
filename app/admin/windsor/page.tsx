'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import AdminAuth from '@/components/AdminAuth';

interface WindsorData {
  account_name: string;
  campaign: string;
  clicks: number;
  datasource: string;
  date: string;
  source: string;
  spend: number;
}

function WindsorPageContent() {
  const [data, setData] = useState<WindsorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [datePreset, setDatePreset] = useState('last_7d');

  useEffect(() => {
    fetchPlatforms();
  }, [datePreset]);

  const fetchPlatforms = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/admin/windsor/platforms?date_preset=${datePreset}`, { cache: 'no-store' });
      const result = await response.json();
      
      if (!response.ok) {
        setError(result.error || 'فشل في جلب البيانات');
        return;
      }
      
      setData(result.data || []);
    } catch (err) {
      console.error('Error fetching platforms:', err);
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (datasource: string) => {
    const icons: { [key: string]: string } = {
      facebook: '📘',
      google_ads: '🔍',
      instagram: '📷',
      tiktok: '🎵',
      snapchat: '👻',
      twitter: '🐦',
      linkedin: '💼',
      pinterest: '📌',
      youtube: '▶️',
      shopify: '🛒',
      google_analytics: '📊',
    };
    return icons[datasource?.toLowerCase()] || '🔗';
  };

  const getPlatformColor = (datasource: string) => {
    const colors: { [key: string]: string } = {
      facebook: 'from-blue-500 to-blue-600',
      google_ads: 'from-yellow-500 to-red-500',
      instagram: 'from-pink-500 to-purple-500',
      tiktok: 'from-gray-800 to-gray-900',
      snapchat: 'from-yellow-400 to-yellow-500',
      twitter: 'from-blue-400 to-blue-500',
      linkedin: 'from-blue-600 to-blue-700',
      pinterest: 'from-red-500 to-red-600',
      youtube: 'from-red-600 to-red-700',
      shopify: 'from-green-500 to-green-600',
      google_analytics: 'from-orange-500 to-yellow-500',
    };
    return colors[datasource?.toLowerCase()] || 'from-purple-500 to-purple-600';
  };

  // تجميع البيانات حسب المنصة
  const groupedData = useMemo(() => {
    return data.reduce((acc: { [key: string]: WindsorData[] }, item) => {
      const key = item.datasource || 'unknown';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {});
  }, [data]);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const totalSpend = data.reduce((sum, item) => sum + (item.spend || 0), 0);
    const totalClicks = data.reduce((sum, item) => sum + (item.clicks || 0), 0);
    const uniqueAccounts = new Set(data.map(item => item.account_name)).size;
    const uniqueCampaigns = new Set(data.map(item => item.campaign)).size;
    return { totalSpend, totalClicks, uniqueAccounts, uniqueCampaigns };
  }, [data]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('ar-SA').format(value);
  };

  return (
    <div className="min-h-screen bg-[#0a0118] pb-20 lg:pb-8 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-14 h-14 sm:w-20 sm:h-20 object-contain"
            />
            <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
            <div>
              <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>
                بيانات Windsor
              </h1>
              <p className="text-purple-300/80 text-xs sm:text-sm">بيانات الحملات الإعلانية من جميع المنصات</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {/* Date Preset Selector */}
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="px-3 py-2 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm"
            >
              <option value="today">اليوم</option>
              <option value="yesterday">أمس</option>
              <option value="last_7d">آخر 7 أيام</option>
              <option value="last_14d">آخر 14 يوم</option>
              <option value="last_30d">آخر 30 يوم</option>
              <option value="this_month">هذا الشهر</option>
              <option value="last_month">الشهر الماضي</option>
            </select>
            <button
              onClick={fetchPlatforms}
              disabled={loading}
              className="p-3 text-blue-400 border border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-500/10 rounded-xl transition-all disabled:opacity-50"
              title="تحديث"
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <Link
              href="/admin"
              className="p-3 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-xl transition-all"
              title="العودة"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-300 flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-purple-300">جاري تحميل البيانات...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && data.length === 0 && (
          <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl p-12 border border-purple-500/20 text-center">
            <div className="w-20 h-20 bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className="text-xl text-white mb-2">لا توجد بيانات</h3>
            <p className="text-purple-300/70 mb-6">تأكد من إضافة WINDSOR_API_KEY في ملف .env.local</p>
            <a
              href="https://onboard.windsor.ai/app/data-preview"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors"
            >
              <span>فتح Windsor.ai</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}

        {/* Data Display */}
        {!loading && data.length > 0 && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-purple-950/40 backdrop-blur-xl rounded-xl p-4 border border-purple-500/20">
                <div className="text-2xl font-bold text-white mb-1">{formatCurrency(stats.totalSpend)}</div>
                <div className="text-purple-300/70 text-sm">إجمالي الصرف</div>
              </div>
              <div className="bg-purple-950/40 backdrop-blur-xl rounded-xl p-4 border border-purple-500/20">
                <div className="text-2xl font-bold text-blue-400 mb-1">{formatNumber(stats.totalClicks)}</div>
                <div className="text-purple-300/70 text-sm">إجمالي النقرات</div>
              </div>
              <div className="bg-purple-950/40 backdrop-blur-xl rounded-xl p-4 border border-purple-500/20">
                <div className="text-2xl font-bold text-green-400 mb-1">{stats.uniqueAccounts}</div>
                <div className="text-purple-300/70 text-sm">الحسابات</div>
              </div>
              <div className="bg-purple-950/40 backdrop-blur-xl rounded-xl p-4 border border-purple-500/20">
                <div className="text-2xl font-bold text-yellow-400 mb-1">{stats.uniqueCampaigns}</div>
                <div className="text-purple-300/70 text-sm">الحملات</div>
              </div>
            </div>

            {/* Grouped by Platform */}
            {Object.entries(groupedData).map(([datasource, platformData]) => {
              const platformSpend = platformData.reduce((sum, item) => sum + (item.spend || 0), 0);
              const platformClicks = platformData.reduce((sum, item) => sum + (item.clicks || 0), 0);
              
              return (
                <div key={datasource} className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
                  <div className={`p-4 bg-gradient-to-r ${getPlatformColor(datasource)} flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getPlatformIcon(datasource)}</span>
                      <div>
                        <h2 className="text-lg font-bold text-white capitalize">{datasource?.replace(/_/g, ' ') || 'Unknown'}</h2>
                        <p className="text-white/70 text-sm">{platformData.length} سجل</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{formatCurrency(platformSpend)}</p>
                      <p className="text-white/70 text-sm">{formatNumber(platformClicks)} نقرة</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-purple-900/30">
                        <tr>
                          <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">الحساب</th>
                          <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">الحملة</th>
                          <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">التاريخ</th>
                          <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">النقرات</th>
                          <th className="px-4 py-3 text-right text-purple-300 text-sm font-medium">الصرف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-500/20">
                        {platformData.slice(0, 10).map((item, index) => (
                          <tr key={index} className="hover:bg-purple-900/20 transition-colors">
                            <td className="px-4 py-3 text-white text-sm">{item.account_name || '-'}</td>
                            <td className="px-4 py-3 text-purple-300 text-sm truncate max-w-[200px]">{item.campaign || '-'}</td>
                            <td className="px-4 py-3 text-purple-300/70 text-sm">{item.date || '-'}</td>
                            <td className="px-4 py-3 text-blue-400 text-sm">{formatNumber(item.clicks || 0)}</td>
                            <td className="px-4 py-3 text-green-400 text-sm">{formatCurrency(item.spend || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {platformData.length > 10 && (
                      <div className="p-3 text-center text-purple-400 text-sm border-t border-purple-500/20">
                        + {platformData.length - 10} سجل آخر
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WindsorPage() {
  return (
    <AdminAuth>
      <WindsorPageContent />
    </AdminAuth>
  );
}
