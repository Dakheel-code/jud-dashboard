'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useBranding } from '@/contexts/BrandingContext';

type Source = 'all' | 'meta' | 'snapchat';

interface AdRow {
  platform: 'meta' | 'snapchat';
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  adset_name: string;
  status: string;
  store_id: string;
  spend: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  currency: string;
  last_sync: string;
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:      'text-green-400 bg-green-500/10 border-green-500/30',
  active:      'text-green-400 bg-green-500/10 border-green-500/30',
  PAUSED:      'text-orange-400 bg-orange-500/10 border-orange-500/30',
  paused:      'text-orange-400 bg-orange-500/10 border-orange-500/30',
  DELETED:     'text-red-400 bg-red-500/10 border-red-500/30',
  DISAPPROVED: 'text-red-400 bg-red-500/10 border-red-500/30',
  ARCHIVED:    'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

const STATUS_AR: Record<string, string> = {
  ACTIVE: 'نشط', active: 'نشط',
  PAUSED: 'متوقف', paused: 'متوقف',
  DELETED: 'محذوف',
  DISAPPROVED: 'مرفوض',
  ARCHIVED: 'مؤرشف',
};

function fmt(n: number | null, decimals = 0): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `${m}د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}س`;
  return `${Math.floor(h / 24)}ي`;
}

export default function AdsClient() {
  const { branding } = useBranding();
  const [source, setSource]     = useState<Source>('all');
  const [search, setSearch]     = useState('');
  const [ads, setAds]           = useState<AdRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const LIMIT = 50;

  const fetchAds = useCallback(async (src: Source, pg: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ source: src, page: String(pg), limit: String(LIMIT) });
      const res = await fetch(`/api/admin/ads?${params}`);
      const data = await res.json();
      setAds(data.ads || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchAds(source, 1);
  }, [source, fetchAds]);

  useEffect(() => {
    fetchAds(source, page);
  }, [page, fetchAds, source]);

  const filtered = useMemo(() => {
    if (!search.trim()) return ads;
    const q = search.toLowerCase();
    return ads.filter(ad =>
      ad.ad_name.toLowerCase().includes(q) ||
      ad.campaign_name.toLowerCase().includes(q) ||
      ad.adset_name.toLowerCase().includes(q)
    );
  }, [ads, search]);

  return (
    <div className="min-h-screen bg-[#0a0118]" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <img src={branding.logo || '/logo.png'} alt="logo" className="w-14 h-14 object-contain" />
          <div className="h-12 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent" />
          <div>
            <h1 className="text-2xl sm:text-3xl text-white font-black uppercase" style={{ fontFamily: "'Codec Pro', sans-serif" }}>
              الإعلانات
            </h1>
            <p className="text-purple-300/70 text-sm">جدول موحّد — Meta + Snapchat</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-purple-950/40 rounded-2xl border border-purple-500/20 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">

            {/* Source filter */}
            <div className="flex gap-1 bg-purple-900/40 rounded-xl p-1">
              {(['all', 'meta', 'snapchat'] as Source[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSource(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    source === s
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-purple-300/70 hover:text-white'
                  }`}
                >
                  {s === 'all' && <span>الكل</span>}
                  {s === 'meta' && (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.04c-5.5 0-9.96 4.46-9.96 9.96 0 4.41 2.87 8.16 6.84 9.49v-6.71H6.9v-2.78h1.98V9.85c0-1.95 1.16-3.03 2.94-3.03.85 0 1.74.15 1.74.15v1.92h-.98c-.97 0-1.27.6-1.27 1.22v1.46h2.16l-.35 2.78h-1.81v6.71c3.97-1.33 6.84-5.08 6.84-9.49 0-5.5-4.46-9.96-9.96-9.96z" />
                      </svg>
                      <span>Meta</span>
                    </>
                  )}
                  {s === 'snapchat' && (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.017 2C8.396 2 5.44 4.957 5.44 8.578c0 .344.028.68.08 1.008-.18.1-.37.15-.57.15-.31 0-.59-.1-.82-.28a.47.47 0 00-.28-.09c-.26 0-.47.21-.47.47 0 .19.11.36.28.44.56.26 1.17.4 1.79.4.06 0 .12 0 .18-.01-.38.87-.6 1.83-.6 2.84 0 .17.01.34.02.51-.01 0-.02 0-.03 0-1.09 0-2.17-.28-3.13-.81a.47.47 0 00-.23-.06c-.26 0-.47.21-.47.47 0 .19.11.36.28.44 1.13.55 2.37.84 3.63.84.08 0 .16 0 .24-.01.42.84 1.08 1.55 1.9 2.06-.34.12-.56.44-.56.8 0 .47.38.85.85.85h7.5c.47 0 .85-.38.85-.85 0-.36-.22-.68-.56-.8.82-.51 1.48-1.22 1.9-2.06.08.01.16.01.24.01 1.26 0 2.5-.29 3.63-.84a.47.47 0 00.28-.44c0-.26-.21-.47-.47-.47a.47.47 0 00-.23.06c-.96.53-2.04.81-3.13.81-.01 0-.02 0-.03 0 .01-.17.02-.34.02-.51 0-1.01-.22-1.97-.6-2.84.06.01.12.01.18.01.62 0 1.23-.14 1.79-.4a.47.47 0 00.28-.44c0-.26-.21-.47-.47-.47a.47.47 0 00-.28.09c-.23.18-.51.28-.82.28-.2 0-.39-.05-.57-.15.052-.328.08-.664.08-1.008C18.594 4.957 15.638 2 12.017 2z" />
                      </svg>
                      <span>Snapchat</span>
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="بحث في الإعلانات..."
                className="w-full pr-9 pl-4 py-2 bg-purple-900/40 border border-purple-500/20 text-white text-sm rounded-xl placeholder-purple-400/50 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchAds(source, page)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-300 text-sm rounded-xl hover:bg-purple-600/30 transition-all disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              تحديث
            </button>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-purple-500/10 text-xs text-purple-400/60">
            <span>{total.toLocaleString()} إعلان إجمالاً</span>
            <span>·</span>
            <span>يُعرض {filtered.length}</span>
            {source !== 'all' && (
              <>
                <span>·</span>
                <span className="capitalize">{source === 'meta' ? 'Meta فقط' : 'Snapchat فقط'}</span>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-purple-950/40 rounded-2xl border border-purple-500/20 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-purple-400/50 text-sm">لا توجد إعلانات</p>
              <p className="text-purple-400/30 text-xs mt-1">تأكد من ربط الحسابات وتشغيل المزامنة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-purple-500/20 text-right">
                    <th className="px-4 py-3 text-xs font-semibold text-purple-400/70 whitespace-nowrap">المنصة</th>
                    <th className="px-4 py-3 text-xs font-semibold text-purple-400/70 whitespace-nowrap">الإعلان</th>
                    <th className="px-4 py-3 text-xs font-semibold text-purple-400/70 whitespace-nowrap">الحملة / المجموعة</th>
                    <th className="px-4 py-3 text-xs font-semibold text-purple-400/70 whitespace-nowrap">الحالة</th>
                    <th className="px-4 py-3 text-xs font-semibold text-purple-400/70 whitespace-nowrap text-center">الإنفاق</th>
                    <th className="px-4 py-3 text-xs font-semibold text-purple-400/70 whitespace-nowrap text-center">النقرات</th>
                    <th className="px-4 py-3 text-xs font-semibold text-purple-400/70 whitespace-nowrap text-center">الظهور</th>
                    <th className="px-4 py-3 text-xs font-semibold text-purple-400/70 whitespace-nowrap text-center">CTR</th>
                    <th className="px-4 py-3 text-xs font-semibold text-purple-400/70 whitespace-nowrap text-center">آخر مزامنة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/10">
                  {filtered.map((ad, i) => {
                    const statusKey = (ad.status || '').toUpperCase();
                    const colorClass = STATUS_COLOR[statusKey] || STATUS_COLOR[ad.status] || 'text-gray-400 bg-gray-500/10 border-gray-500/30';
                    const statusLabel = STATUS_AR[statusKey] || STATUS_AR[ad.status] || ad.status;

                    return (
                      <tr key={`${ad.platform}-${ad.ad_id}-${i}`} className="hover:bg-purple-500/5 transition-colors">
                        {/* Platform */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {ad.platform === 'meta' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.04c-5.5 0-9.96 4.46-9.96 9.96 0 4.41 2.87 8.16 6.84 9.49v-6.71H6.9v-2.78h1.98V9.85c0-1.95 1.16-3.03 2.94-3.03.85 0 1.74.15 1.74.15v1.92h-.98c-.97 0-1.27.6-1.27 1.22v1.46h2.16l-.35 2.78h-1.81v6.71c3.97-1.33 6.84-5.08 6.84-9.49 0-5.5-4.46-9.96-9.96-9.96z" />
                              </svg>
                              Meta
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium">
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="12" r="4" />
                              </svg>
                              Snapchat
                            </span>
                          )}
                        </td>

                        {/* Ad name */}
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-white text-xs font-medium truncate" title={ad.ad_name}>{ad.ad_name}</p>
                          <p className="text-purple-400/40 text-xs truncate" dir="ltr">{ad.ad_id}</p>
                        </td>

                        {/* Campaign / Adset */}
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-purple-200/80 text-xs truncate" title={ad.campaign_name}>{ad.campaign_name}</p>
                          <p className="text-purple-400/50 text-xs truncate" title={ad.adset_name}>{ad.adset_name}</p>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${colorClass}`}>
                            {statusLabel}
                          </span>
                        </td>

                        {/* Spend */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className="text-xs text-white font-medium">
                            {ad.spend !== null ? `${fmt(ad.spend, 1)} ${ad.currency}` : '—'}
                          </span>
                        </td>

                        {/* Clicks */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className="text-xs text-purple-200">{fmt(ad.clicks)}</span>
                        </td>

                        {/* Impressions */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className="text-xs text-purple-200">{fmt(ad.impressions)}</span>
                        </td>

                        {/* CTR */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className="text-xs text-purple-200">
                            {ad.ctr !== null ? `${fmt(ad.ctr, 2)}%` : '—'}
                          </span>
                        </td>

                        {/* Last sync */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className="text-xs text-purple-400/60" title={new Date(ad.last_sync).toLocaleString('ar-SA')}>
                            {timeAgo(ad.last_sync)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1.5 text-xs bg-purple-900/40 border border-purple-500/20 text-purple-300 rounded-lg disabled:opacity-40 hover:bg-purple-900/60 transition-all"
            >
              السابق
            </button>
            <span className="text-xs text-purple-400/60">
              {page} / {pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages || loading}
              className="px-3 py-1.5 text-xs bg-purple-900/40 border border-purple-500/20 text-purple-300 rounded-lg disabled:opacity-40 hover:bg-purple-900/60 transition-all"
            >
              التالي
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
