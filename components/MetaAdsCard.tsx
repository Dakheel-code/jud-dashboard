'use client';

import { useEffect, useState, useCallback } from 'react';

interface MetaConnection {
  id: string;
  meta_user_name?: string;
  ad_account_id?: string;
  ad_account_name?: string;
  status: 'active' | 'revoked' | 'error';
  last_sync_at?: string;
}

interface AdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  timezone_name: string;
}

interface MetaAd {
  id: string;
  ad_id: string;
  ad_name?: string;
  campaign_name?: string;
  adset_name?: string;
  status?: string;
  effective_status?: string;
  creative_preview_url?: string;
}

interface MetaInsights {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  currency: string;
}

interface Props {
  storeId: string;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'نشط',
  PAUSED: 'متوقف',
  DELETED: 'محذوف',
  ARCHIVED: 'مؤرشف',
  DISAPPROVED: 'مرفوض',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-green-400 bg-green-500/10 border-green-500/30',
  PAUSED: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  DELETED: 'text-red-400 bg-red-500/10 border-red-500/30',
  DISAPPROVED: 'text-red-400 bg-red-500/10 border-red-500/30',
  ARCHIVED: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
};

export default function MetaAdsCard({ storeId }: Props) {
  const [connection, setConnection] = useState<MetaConnection | null>(null);
  const [loadingConn, setLoadingConn] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(true);

  // حالة اختيار الحساب الإعلاني
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  // حالة الإعلانات والإحصائيات
  const [ads, setAds] = useState<MetaAd[]>([]);
  const [insights, setInsights] = useState<MetaInsights | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // جلب حالة الاتصال
  const fetchConnection = useCallback(async () => {
    try {
      const res = await fetch(`/api/meta/adaccounts?storeId=${storeId}`);
      if (res.status === 404) { setConnection(null); setLoadingConn(false); return; }
      // نستخدم adaccounts endpoint للتحقق من الاتصال
      // لكن نحتاج endpoint مخصص — نجلب من الكاش مباشرة
      const connRes = await fetch(`/api/meta/connection?storeId=${storeId}`);
      if (connRes.ok) {
        const data = await connRes.json();
        setConnection(data.connection || null);
      } else {
        setConnection(null);
      }
    } catch {
      setConnection(null);
    } finally {
      setLoadingConn(false);
    }
  }, [storeId]);

  useEffect(() => { fetchConnection(); }, [fetchConnection]);

  // جلب الإعلانات من الكاش عند فتح القسم
  useEffect(() => {
    if (!isCollapsed && connection?.ad_account_id && connection.status === 'active') {
      fetchCachedAds();
      fetchCachedInsights();
    }
  }, [isCollapsed, connection]);

  const fetchCachedAds = async () => {
    try {
      const res = await fetch(`/api/meta/ads?storeId=${storeId}`);
      if (res.ok) {
        const data = await res.json();
        setAds(data.ads || []);
      }
    } catch { /* silent */ }
  };

  const fetchCachedInsights = async () => {
    try {
      const res = await fetch(`/api/meta/insights?storeId=${storeId}&datePreset=last_7d`);
      if (res.ok) {
        const data = await res.json();
        setInsights(data.summary || null);
      }
    } catch { /* silent */ }
  };

  // جلب قائمة الحسابات الإعلانية
  const loadAdAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch(`/api/meta/adaccounts?storeId=${storeId}`);
      const data = await res.json();
      setAdAccounts(data.accounts || []);
    } catch {
      setAdAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // حفظ اختيار الحساب
  const saveAdAccount = async () => {
    if (!selectedAccount) return;
    const acc = adAccounts.find(a => a.id === selectedAccount);
    setSavingAccount(true);
    try {
      const res = await fetch('/api/meta/select-adaccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, ad_account_id: acc?.id, ad_account_name: acc?.name }),
      });
      if (res.ok) {
        await fetchConnection();
        setAdAccounts([]);
        setSelectedAccount('');
      }
    } finally {
      setSavingAccount(false);
    }
  };

  // مزامنة الإعلانات
  const syncAds = async () => {
    setSyncing(true);
    try {
      await fetch(`/api/meta/sync-ads?storeId=${storeId}`, { method: 'POST' });
      await fetch(`/api/meta/sync-insights?storeId=${storeId}&datePreset=last_7d`, { method: 'POST' });
      await fetchCachedAds();
      await fetchCachedInsights();
      await fetchConnection();
    } finally {
      setSyncing(false);
    }
  };

  // فصل الربط
  const disconnect = async () => {
    if (!confirm('هل أنت متأكد من فصل ربط Meta؟')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/meta/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      });
      setConnection(null);
      setAds([]);
      setInsights(null);
    } finally {
      setDisconnecting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────

  const renderState = () => {
    if (loadingConn) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    // الحالة 1: غير مربوط
    if (!connection || connection.status === 'revoked') {
      return (
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <MetaIcon className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-purple-300/70 text-sm mb-4">اختيار حساب إعلاني لهذا المتجر</p>
          <a
            href={`/api/meta/connect?storeId=${storeId}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            <MetaIcon className="w-4 h-4" />
            ربط حساب Meta
          </a>
        </div>
      );
    }

    // الحالة خطأ في التوكن
    if (connection.status === 'error') {
      return (
        <div className="p-6 text-center">
          <p className="text-red-400 text-sm mb-3">انتهت صلاحية الربط — يرجى إعادة الربط</p>
          <a
            href={`/api/meta/connect?storeId=${storeId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/30 text-red-400 text-sm rounded-xl hover:bg-red-600/30 transition-all"
          >
            إعادة الربط
          </a>
        </div>
      );
    }

    // الحالة 2: مربوط بدون Ad Account
    if (!connection.ad_account_id) {
      return (
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4 text-sm text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            مرتبط كـ: <span className="font-semibold">{connection.meta_user_name || 'مستخدم Meta'}</span>
          </div>
          <p className="text-purple-300/70 text-sm mb-3">اختر الحساب الإعلاني لهذا المتجر:</p>

          {adAccounts.length === 0 && !loadingAccounts && (
            <button
              onClick={loadAdAccounts}
              className="w-full py-2.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-sm rounded-xl hover:bg-blue-600/30 transition-all mb-3"
            >
              تحميل الحسابات الإعلانية
            </button>
          )}

          {loadingAccounts && (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {adAccounts.length > 0 && (
            <div className="space-y-3">
              <select
                value={selectedAccount}
                onChange={e => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2.5 bg-purple-900/50 border border-purple-500/30 text-white text-sm rounded-xl focus:ring-1 focus:ring-blue-500 outline-none [&>option]:bg-[#1a0a2e]"
              >
                <option value="">اختر حساباً إعلانياً...</option>
                {adAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency})
                  </option>
                ))}
              </select>
              <button
                onClick={saveAdAccount}
                disabled={!selectedAccount || savingAccount}
                className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
              >
                {savingAccount ? 'جاري الحفظ...' : 'تأكيد الاختيار'}
              </button>
            </div>
          )}
        </div>
      );
    }

    // الحالة 3: مربوط + Ad Account محدد
    return (
      <div className="p-5 space-y-4">
        {/* معلومات الاتصال */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-green-400 font-medium">{connection.meta_user_name || 'مستخدم Meta'}</span>
            </div>
            <p className="text-xs text-purple-300/60">
              {connection.ad_account_name || connection.ad_account_id}
            </p>
            {connection.last_sync_at && (
              <p className="text-xs text-purple-400/50">
                آخر مزامنة: {new Date(connection.last_sync_at).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={syncAds}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs rounded-lg hover:bg-blue-600/30 transition-all disabled:opacity-50"
            >
              {syncing ? (
                <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {syncing ? 'جاري التحديث...' : 'تحديث'}
            </button>
            <button
              onClick={disconnect}
              disabled={disconnecting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 border border-red-500/20 text-red-400 text-xs rounded-lg hover:bg-red-600/20 transition-all disabled:opacity-50"
            >
              {disconnecting ? 'جاري الفصل...' : 'فصل الربط'}
            </button>
          </div>
        </div>

        {/* KPIs من الإحصائيات */}
        {insights && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'الإنفاق', value: `${insights.spend.toFixed(0)} ${insights.currency}`, color: 'text-blue-400' },
              { label: 'النقرات', value: insights.clicks.toLocaleString(), color: 'text-purple-400' },
              { label: 'CTR', value: `${insights.ctr.toFixed(2)}%`, color: 'text-green-400' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-purple-900/30 rounded-xl p-3 text-center border border-purple-500/10">
                <p className={`text-base font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-purple-400/60 mt-0.5">{kpi.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Top 5 إعلانات */}
        {ads.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-purple-300/60 font-medium">أحدث الإعلانات</p>
            {ads.slice(0, 5).map(ad => {
              const effStatus = (ad.effective_status || ad.status || '').toUpperCase();
              const colorClass = STATUS_COLORS[effStatus] || 'text-gray-400 bg-gray-500/10 border-gray-500/30';
              return (
                <div key={ad.ad_id} className="flex items-center justify-between gap-3 bg-purple-900/20 rounded-xl px-3 py-2.5 border border-purple-500/10">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white font-medium truncate">{ad.ad_name || ad.ad_id}</p>
                    {ad.campaign_name && (
                      <p className="text-xs text-purple-400/50 truncate">{ad.campaign_name}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${colorClass}`}>
                    {STATUS_LABELS[effStatus] || effStatus || '—'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-purple-400/50 text-xs">لا توجد إعلانات في الكاش — اضغط تحديث</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-purple-950/40 rounded-2xl border border-purple-500/20 overflow-hidden mb-6">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full p-4 flex items-center justify-between hover:bg-purple-500/5 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <MetaIcon className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-white">Meta Ads</h2>
            <p className="text-xs text-purple-300/60">
              {loadingConn ? 'جاري التحميل...' :
               !connection || connection.status === 'revoked' ? 'غير مربوط' :
               connection.status === 'error' ? 'خطأ في الربط' :
               !connection.ad_account_id ? 'مربوط — بانتظار اختيار الحساب' :
               `${connection.ad_account_name || connection.ad_account_id}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connection?.status === 'active' && (
            <span className="w-2 h-2 rounded-full bg-green-400" />
          )}
          <svg
            className={`w-5 h-5 text-purple-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {!isCollapsed && renderState()}
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
