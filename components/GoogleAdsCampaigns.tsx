'use client';

import { useEffect, useState, useCallback } from 'react';

interface GoogleAdsCampaign {
  campaign_id: string;
  campaign_name: string;
  status: string;
  advertising_channel_type: string;
  budget_amount: number;
  bidding_strategy_type: string;
}

interface ReportTotals {
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  avg_cpc: number;
  cost_per_conversion: number;
}

interface Props {
  storeId: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  ENABLED: { label: 'نشطة',   color: 'bg-green-500/20 text-green-400' },
  PAUSED:  { label: 'متوقفة', color: 'bg-yellow-500/20 text-yellow-400' },
  REMOVED: { label: 'محذوفة', color: 'bg-red-500/20 text-red-400' },
};

const CHANNEL_MAP: Record<string, string> = {
  SEARCH:          'بحث',
  DISPLAY:         'شبكة العرض',
  VIDEO:           'فيديو',
  SHOPPING:        'تسوق',
  PERFORMANCE_MAX: 'أداء أقصى',
  SMART:           'ذكية',
  DISCOVERY:       'اكتشاف',
  DEMAND_GEN:      'توليد طلب',
  LOCAL:           'محلية',
  HOTEL:           'فنادق',
  APP:             'تطبيق',
};

function fmtNum(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

function getLast30Days() {
  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(start), end: fmt(end) };
}

function GoogleIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function GoogleAdsCampaigns({ storeId }: Props) {
  const [campaigns, setCampaigns]     = useState<GoogleAdsCampaign[]>([]);
  const [totals, setTotals]           = useState<ReportTotals | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const [syncing, setSyncing]         = useState(false);

  const fetchData = useCallback(async (sync = false) => {
    setLoading(true);
    setError(null);
    try {
      const campRes = await fetch(`/api/google-ads/campaigns?store_id=${storeId}${sync ? '&sync=true' : ''}`);
      const campData = await campRes.json();

      if (!campRes.ok || campData.connected === false) {
        setNotConnected(true);
        return;
      }

      setCampaigns(campData.campaigns ?? []);

      const { start, end } = getLast30Days();
      const repRes = await fetch(
        `/api/google-ads/reports?store_id=${storeId}&start_date=${start}&end_date=${end}`
      );
      if (repRes.ok) {
        const repData = await repRes.json();
        setTotals(repData.totals ?? null);
      }
    } catch (e: any) {
      setError(e.message || 'خطأ في جلب البيانات');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [storeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    await fetchData(true);
  };

  if (!loading && notConnected) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-8 text-center">
        <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center mx-auto mb-4">
          <GoogleIcon className="w-7 h-7" />
        </div>
        <p className="text-white/60 text-sm">Google Ads غير مربوط لهذا المتجر</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/5 overflow-hidden animate-pulse">
        <div className="p-4 border-b border-green-500/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10" />
          <div className="h-5 bg-white/10 rounded w-36" />
        </div>
        <div className="grid grid-cols-4 gap-3 p-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-xl" />)}
        </div>
        <div className="p-4 space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-400 text-sm">⚠️ {error}</p>
        <button onClick={() => fetchData()} className="mt-3 text-xs text-red-300 underline">إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-green-500/20 bg-green-500/5 overflow-hidden" dir="rtl">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-green-500/10 bg-black/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
            <GoogleIcon className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-white">حملات Google Ads</span>
          <span className="text-xs text-white/40">({campaigns.length} حملة)</span>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white/70 hover:bg-white/15 transition-all disabled:opacity-50"
        >
          <svg className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncing ? 'جاري...' : 'مزامنة'}
        </button>
      </div>

      {/* ─── Stats Summary ─── */}
      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-green-500/10">
          {[
            { label: 'الإنفاق (30 يوم)', value: fmtNum(totals.cost, 2), sub: '$',    color: 'text-orange-300' },
            { label: 'الظهور',           value: fmtNum(totals.impressions), sub: 'مرة', color: 'text-blue-300' },
            { label: 'النقرات',          value: fmtNum(totals.clicks), sub: 'نقرة',  color: 'text-cyan-300' },
            { label: 'التحويلات',        value: fmtNum(totals.conversions, 1), sub: 'تحويل', color: 'text-green-300' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-3 border border-white/8">
              <p className="text-xs text-white/40 mb-1">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-white/30">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─── جدول الحملات ─── */}
      {campaigns.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-white/40 text-sm">لا توجد حملات</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="text-white/40 text-xs border-b border-white/10 bg-white/3">
                <th className="text-right py-3 px-4">اسم الحملة</th>
                <th className="text-center py-3 px-3">النوع</th>
                <th className="text-center py-3 px-3">الميزانية اليومية</th>
                <th className="text-center py-3 px-3">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const statusInfo = STATUS_MAP[c.status] ?? { label: c.status, color: 'bg-purple-500/20 text-purple-400' };
                return (
                  <tr key={c.campaign_id} className="border-t border-white/8 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-right">
                      <p className="text-white/90 font-medium truncate max-w-[220px]" title={c.campaign_name}>
                        {c.campaign_name}
                      </p>
                      <p className="text-xs text-white/30 mt-0.5">{c.campaign_id}</p>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-xs text-white/60">
                        {CHANNEL_MAP[c.advertising_channel_type] ?? c.advertising_channel_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-xs text-orange-300 font-medium">
                        {c.budget_amount > 0 ? `$${fmtNum(c.budget_amount, 2)}` : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
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
  );
}
