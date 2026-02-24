'use client';

import { useEffect, useState, useCallback } from 'react';

interface MetaConnection {
  id: string;
  meta_user_name?: string;
  ad_account_id?: string;
  ad_account_name?: string;
  status: 'active' | 'connected' | 'revoked' | 'error';
  last_sync_at?: string;
}
interface AdAccount { id: string; name: string; account_status: number; currency: string; }
interface MetaAd {
  id: string; ad_id: string; ad_name?: string;
  campaign_name?: string; adset_name?: string;
  status?: string; effective_status?: string;
}
interface MetaInsights {
  spend: number; impressions: number; clicks: number; reach: number;
  ctr: number; cpc: number; cpm: number; conversions: number; currency: string;
}
interface SummaryOut { spend: number; conversions: number; revenue: number; roas: number; currency: string; }
interface Props { storeId: string; embedded?: boolean; onSummaryLoaded?: (s: SummaryOut | null) => void; externalPreset?: string; }

const DATE_PRESETS = [
  { label: 'اليوم',   value: 'today' },
  { label: 'أمس',    value: 'yesterday' },
  { label: '7 أيام', value: 'last_7d' },
  { label: '30 يوم', value: 'last_30d' },
  { label: '90 يوم', value: 'last_90d' },
];

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'نشط', PAUSED: 'متوقف', CAMPAIGN_PAUSED: 'متوقف',
  DELETED: 'محذوف', ARCHIVED: 'مؤرشف', DISAPPROVED: 'مرفوض', WITH_ISSUES: 'مشكلة',
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE:          'text-green-400 bg-green-500/10 border-green-500/30',
  PAUSED:          'text-orange-400 bg-orange-500/10 border-orange-500/30',
  CAMPAIGN_PAUSED: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  WITH_ISSUES:     'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  DELETED:         'text-red-400 bg-red-500/10 border-red-500/30',
  DISAPPROVED:     'text-red-400 bg-red-500/10 border-red-500/30',
  ARCHIVED:        'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

function fmt(n: number) { return n?.toLocaleString('ar-SA') ?? '0'; }

export default function MetaAdsCard({ storeId, embedded = false, onSummaryLoaded, externalPreset }: Props) {
  const [connection, setConnection]           = useState<MetaConnection | null>(null);
  const [loadingConn, setLoadingConn]         = useState(true);
  const [isCollapsed, setIsCollapsed]         = useState(true);
  const [datePreset, setDatePreset]           = useState('last_7d');
  const [adAccounts, setAdAccounts]           = useState<AdAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [savingAccount, setSavingAccount]     = useState(false);
  const [ads, setAds]                         = useState<MetaAd[]>([]);
  const [insights, setInsights]               = useState<MetaInsights | null>(null);
  const [syncing, setSyncing]                 = useState(false);
  const [disconnecting, setDisconnecting]     = useState(false);
  const [showAll, setShowAll]                 = useState(false);

  const fetchConnection = useCallback(async () => {
    try {
      const res = await fetch(`/api/meta/connection?storeId=${storeId}`);
      if (res.ok) { const d = await res.json(); setConnection(d.connection || null); }
      else setConnection(null);
    } catch { setConnection(null); }
    finally { setLoadingConn(false); }
  }, [storeId]);

  const fetchCachedAds = useCallback(async () => {
    try {
      const res = await fetch(`/api/meta/ads?storeId=${storeId}`);
      if (res.ok) { const d = await res.json(); setAds(d.ads || []); }
    } catch { /* silent */ }
  }, [storeId]);

  const fetchCachedInsights = useCallback(async (preset: string) => {
    try {
      const live = await fetch(`/api/meta/insights-live?storeId=${storeId}&datePreset=${preset}`);
      if (live.ok) {
        const d = await live.json();
        const s = d.summary || null;
        setInsights(s);
        onSummaryLoaded?.(s ? { spend: s.spend, conversions: s.conversions, revenue: s.revenue ?? 0, roas: s.roas ?? 0, currency: s.currency } : null);
        return;
      }
      const cached = await fetch(`/api/meta/insights?storeId=${storeId}&datePreset=${preset}`);
      if (cached.ok) { const d = await cached.json(); setInsights(d.summary || null); }
    } catch { /* silent */ }
  }, [storeId, onSummaryLoaded]);

  useEffect(() => { fetchConnection(); }, [fetchConnection]);

  // جلب البيانات تلقائياً عند فتح القسم أو تغيير الاتصال
  useEffect(() => {
    const isConnected = connection?.ad_account_id && (connection.status === 'active' || connection.status === 'connected');
    if (isConnected) {
      fetchCachedAds();
      fetchCachedInsights(datePreset);
    }
  }, [connection]);

  // إعادة الجلب عند تغيير الفترة من الخارج (embedded mode)
  useEffect(() => {
    if (!externalPreset) return;
    const isConnected = connection?.ad_account_id && (connection.status === 'active' || connection.status === 'connected');
    if (isConnected) {
      setInsights(null);
      fetchCachedInsights(externalPreset);
    }
  }, [externalPreset]);

  const handlePreset = (p: string) => {
    setDatePreset(p);
    fetchCachedInsights(p);
  };

  const loadAdAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch(`/api/meta/adaccounts?storeId=${storeId}`);
      const d = await res.json(); setAdAccounts(d.accounts || []);
    } catch { setAdAccounts([]); }
    finally { setLoadingAccounts(false); }
  };

  const saveAdAccount = async () => {
    if (!selectedAccount) return;
    const acc = adAccounts.find(a => a.id === selectedAccount);
    setSavingAccount(true);
    try {
      const res = await fetch('/api/meta/select-adaccount', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, ad_account_id: acc?.id, ad_account_name: acc?.name }),
      });
      if (res.ok) { await fetchConnection(); setAdAccounts([]); setSelectedAccount(''); }
    } finally { setSavingAccount(false); }
  };

  const syncAds = async () => {
    setSyncing(true);
    try {
      await fetch(`/api/meta/sync-ads?storeId=${storeId}`, { method: 'POST' });
      await fetch(`/api/meta/sync-insights?storeId=${storeId}&datePreset=${datePreset}`, { method: 'POST' });
      await fetchCachedAds();
      await fetchCachedInsights(datePreset);
      await fetchConnection();
    } finally { setSyncing(false); }
  };

  const disconnect = async () => {
    if (!confirm('هل أنت متأكد من فصل ربط Meta؟')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/meta/disconnect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      });
      setConnection(null); setAds([]); setInsights(null);
    } finally { setDisconnecting(false); }
  };

  // ─── Header subtitle ──────────────────────────────────
  const subtitle = loadingConn ? 'جاري التحميل...'
    : !connection || connection.status === 'revoked' ? 'غير مربوط'
    : connection.status === 'error' ? 'خطأ في الربط'
    : !connection.ad_account_id ? 'مربوط — بانتظار اختيار الحساب'
    : connection.ad_account_name || connection.ad_account_id || '';

  // ─── Render body ──────────────────────────────────────
  const renderBody = () => {
    if (loadingConn) return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

    if (!connection || connection.status === 'revoked') return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <MetaIcon className="w-8 h-8 text-blue-400" />
        </div>
        <p className="text-purple-300/60 text-sm mb-5">اربط حساب Meta Ads لهذا المتجر</p>
        <a href={`/api/meta/connect?storeId=${storeId}`}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20">
          <MetaIcon className="w-4 h-4" /> ربط حساب Meta
        </a>
      </div>
    );

    if (connection.status === 'error') return (
      <div className="p-8 text-center">
        <p className="text-red-400 text-sm mb-4">انتهت صلاحية الربط — يرجى إعادة الربط</p>
        <a href={`/api/meta/connect?storeId=${storeId}`}
          className="inline-flex items-center gap-2 px-5 py-2 bg-red-600/20 border border-red-500/30 text-red-400 text-sm rounded-xl hover:bg-red-600/30 transition-all">
          إعادة الربط
        </a>
      </div>
    );

    if (!connection.ad_account_id) return (
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm text-green-400">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          مرتبط كـ: <span className="font-semibold">{connection.meta_user_name || 'مستخدم Meta'}</span>
        </div>
        <p className="text-purple-300/60 text-sm">اختر الحساب الإعلاني لهذا المتجر:</p>
        {adAccounts.length === 0 && !loadingAccounts && (
          <button onClick={loadAdAccounts}
            className="w-full py-2.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm rounded-xl hover:bg-blue-600/30 transition-all">
            تحميل الحسابات الإعلانية
          </button>
        )}
        {loadingAccounts && <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}
        {adAccounts.length > 0 && (
          <div className="space-y-3">
            <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2.5 bg-purple-900/50 border border-purple-500/30 text-white text-sm rounded-xl outline-none [&>option]:bg-[#1a0a2e]">
              <option value="">اختر حساباً إعلانياً...</option>
              {adAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>)}
            </select>
            <button onClick={saveAdAccount} disabled={!selectedAccount || savingAccount}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all">
              {savingAccount ? 'جاري الحفظ...' : 'تأكيد الاختيار'}
            </button>
          </div>
        )}
      </div>
    );

    // ─── الحالة الكاملة ────────────────────────────────────
    const visibleAds = showAll ? ads : ads.slice(0, 5);

    return (
      <div className="p-5 space-y-5">

        {/* صف الأزرار */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-semibold text-green-400">{connection.meta_user_name || 'مستخدم Meta'}</span>
            </div>
            <p className="text-xs text-purple-300/60 mt-0.5">{connection.ad_account_name || connection.ad_account_id}</p>
            {connection.last_sync_at && (
              <p className="text-xs text-purple-400/40 mt-0.5">
                آخر مزامنة: {new Date(connection.last_sync_at).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={syncAds} disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs rounded-lg hover:bg-blue-600/30 transition-all disabled:opacity-50">
              {syncing
                ? <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              }
              {syncing ? 'جاري التحديث...' : 'تحديث'}
            </button>
            <button onClick={disconnect} disabled={disconnecting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 border border-red-500/20 text-red-400 text-xs rounded-lg hover:bg-red-600/20 transition-all disabled:opacity-50">
              {disconnecting ? 'جاري الفصل...' : 'فصل الربط'}
            </button>
          </div>
        </div>

        {/* فلتر الفترة الزمنية */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-purple-400/60 ml-1">الفترة:</span>
          {DATE_PRESETS.map(p => (
            <button key={p.value} onClick={() => handlePreset(p.value)}
              className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                datePreset === p.value
                  ? 'bg-yellow-500 border-yellow-500 text-black font-bold'
                  : 'bg-purple-900/30 border-purple-500/20 text-purple-300/70 hover:border-purple-400/40'
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* KPIs — 4 بطاقات */}
        {insights ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'الصرف',    value: `${fmt(Math.round(insights.spend))}`,                                          sub: insights.currency, color: 'from-red-900/40 to-red-800/20',     border: 'border-red-500/20',    text: 'text-red-300' },
              { label: 'الطلبات',  value: fmt(Math.round(insights.conversions)),                                          sub: 'طلب',             color: 'from-green-900/40 to-green-800/20',  border: 'border-green-500/20',  text: 'text-green-300' },
              { label: 'المبيعات', value: `${fmt(Math.round((insights as any).revenue ?? 0))}`,                          sub: insights.currency, color: 'from-blue-900/40 to-blue-800/20',    border: 'border-blue-500/20',   text: 'text-blue-300' },
              { label: 'العائد',   value: `${((insights as any).roas ?? 0).toFixed(2)}x`,                                sub: 'ROAS',            color: 'from-purple-900/40 to-purple-800/20',border: 'border-purple-500/20', text: 'text-purple-300' },
            ].map(k => (
              <div key={k.label} className={`bg-gradient-to-br ${k.color} rounded-xl p-4 border ${k.border} text-center`}>
                <p className={`text-xl font-black ${k.text}`}>{k.value}</p>
                <p className="text-xs text-purple-300/50 mt-0.5">{k.sub}</p>
                <p className="text-xs text-purple-400/70 mt-1 font-medium">{k.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-purple-900/20 rounded-xl p-4 border border-purple-500/10 animate-pulse h-20" />
            ))}
          </div>
        )}

        {/* جدول الإعلانات */}
        <div>
          <p className="text-xs text-purple-300/60 font-semibold mb-2">أحدث الإعلانات</p>

          {ads.length === 0 ? (
            <div className="text-center py-6 text-purple-400/40 text-xs">
              لا توجد إعلانات في الكاش — اضغط تحديث
            </div>
          ) : (
            <>
              {/* رأس الجدول */}
              <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-1.5 text-xs text-purple-400/50 font-semibold border-b border-purple-500/10 mb-1">
                <span>الإعلان / الحملة</span>
                <span className="text-left">الحالة</span>
              </div>

              {visibleAds.map(ad => {
                const effStatus = (ad.effective_status || ad.status || '').toUpperCase();
                const colorClass = STATUS_COLORS[effStatus] || 'text-gray-400 bg-gray-500/10 border-gray-500/30';
                return (
                  <div key={ad.ad_id}
                    className="grid grid-cols-[1fr_auto] gap-2 items-center px-3 py-2.5 border-b border-purple-500/5 hover:bg-purple-500/5 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{ad.ad_name || ad.ad_id}</p>
                      {ad.campaign_name && (
                        <p className="text-xs text-purple-400/50 truncate">{ad.campaign_name}</p>
                      )}
                    </div>
                    <span className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full border font-medium ${colorClass}`}>
                      {STATUS_LABELS[effStatus] || effStatus || '—'}
                    </span>
                  </div>
                );
              })}

              {ads.length > 5 && (
                <button onClick={() => setShowAll(!showAll)}
                  className="w-full mt-2 py-2 text-xs text-purple-400/70 hover:text-purple-300 transition-colors text-center">
                  {showAll ? 'عرض أقل' : `عرض المزيد (${ads.length - 5} إعلان متبقي)`}
                </button>
              )}
            </>
          )}
        </div>

      </div>
    );
  };

  if (embedded) {
    return <div className="bg-transparent">{renderBody()}</div>;
  }

  return (
    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl overflow-hidden mb-0">
      {/* Header — مطابق لـ Snapchat/Google */}
      <button onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full p-4 flex items-center justify-between hover:bg-indigo-500/5 transition-all">

        {/* يسار: سهم + نقطة خضراء */}
        <div className="flex items-center gap-2">
          <svg className={`w-5 h-5 text-indigo-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {connection?.status === 'active' && (
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          )}
          {!loadingConn && (!connection || connection.status === 'revoked' || connection.status === 'error') && (
            <a href={`/api/meta/connect?storeId=${storeId}`} onClick={e => e.stopPropagation()}
              className="px-3 py-1 text-xs bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-lg hover:bg-blue-600/50 transition-all">
              ربط
            </a>
          )}
        </div>

        {/* يمين: عنوان + أيقونة — مطابق لـ Snapchat */}
        <div className="flex items-center gap-3">
          <p className="text-white font-bold text-base tracking-wide">META ADS</p>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 008.44-9.9c0-5.53-4.5-10.02-10-10.02z"/>
            </svg>
          </div>
        </div>
      </button>

      {!isCollapsed && renderBody()}
    </div>
  );
}

function MetaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.04c-5.5 0-9.96 4.46-9.96 9.96 0 4.41 2.87 8.16 6.84 9.49v-6.71H6.9v-2.78h1.98V9.85c0-1.95 1.16-3.03 2.94-3.03.85 0 1.74.15 1.74.15v1.92h-.98c-.97 0-1.27.6-1.27 1.22v1.46h2.16l-.35 2.78h-1.81v6.71c3.97-1.33 6.84-5.08 6.84-9.49 0-5.5-4.46-9.96-9.96-9.96z" />
    </svg>
  );
}
