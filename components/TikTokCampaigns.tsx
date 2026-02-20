'use client';

import { useEffect, useState, useCallback } from 'react';

interface TikTokCampaign {
  campaign_id: string;
  campaign_name: string;
  objective_type: string;
  budget: number;
  budget_mode: string;
  operation_status: string;
  status: string;
}

interface ReportTotals {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cost_per_conversion: number;
}

interface Props {
  storeId: string;
}

// ترجمة حالات الحملة
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  CAMPAIGN_STATUS_ENABLE: { label: 'نشطة',    color: 'bg-green-500/20 text-green-400' },
  ENABLE:                 { label: 'نشطة',    color: 'bg-green-500/20 text-green-400' },
  CAMPAIGN_STATUS_DISABLE:{ label: 'متوقفة',  color: 'bg-gray-500/20 text-gray-400' },
  DISABLE:                { label: 'متوقفة',  color: 'bg-gray-500/20 text-gray-400' },
  CAMPAIGN_STATUS_DELETE: { label: 'محذوفة',  color: 'bg-red-500/20 text-red-400' },
};

// ترجمة أهداف الحملة
const OBJECTIVE_MAP: Record<string, string> = {
  TRAFFIC:          'زيارات',
  CONVERSIONS:      'تحويلات',
  APP_INSTALL:      'تثبيت تطبيق',
  REACH:            'وصول',
  VIDEO_VIEWS:      'مشاهدات فيديو',
  LEAD_GENERATION:  'توليد عملاء',
  PRODUCT_SALES:    'مبيعات منتجات',
  WEB_CONVERSIONS:  'تحويلات ويب',
};

function getStatusInfo(status: string) {
  return STATUS_MAP[status] ?? { label: status, color: 'bg-purple-500/20 text-purple-400' };
}

function fmtNum(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
}

// تاريخ آخر 30 يوم
function getLast30Days() {
  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return { start: fmt(start), end: fmt(end) };
}

export default function TikTokCampaigns({ storeId }: Props) {
  const [campaigns, setCampaigns]   = useState<TikTokCampaign[]>([]);
  const [totals, setTotals]         = useState<ReportTotals | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const [syncing, setSyncing]       = useState(false);

  const fetchData = useCallback(async (sync = false) => {
    setLoading(true);
    setError(null);
    try {
      // جلب الحملات
      const campRes = await fetch(`/api/tiktok/campaigns?store_id=${storeId}${sync ? '&sync=true' : ''}`);
      const campData = await campRes.json();

      if (!campRes.ok || campData.connected === false) {
        setNotConnected(true);
        return;
      }

      setCampaigns(campData.campaigns ?? []);

      // جلب التقارير (آخر 30 يوم)
      const { start, end } = getLast30Days();
      const repRes = await fetch(
        `/api/tiktok/reports?store_id=${storeId}&start_date=${start}&end_date=${end}`
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

  // ─── حالة: غير مرتبط ─────────────────────────────
  if (!loading && notConnected) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="w-14 h-14 rounded-xl bg-black border border-white/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-white/60" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z" />
          </svg>
        </div>
        <p className="text-white/60 text-sm">تيك توك غير مرتبط لهذا المتجر</p>
      </div>
    );
  }

  // ─── حالة: تحميل ─────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden animate-pulse">
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10" />
          <div className="h-5 bg-white/10 rounded w-32" />
        </div>
        <div className="grid grid-cols-4 gap-3 p-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="p-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // ─── حالة: خطأ ───────────────────────────────────
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-red-400 text-sm">⚠️ {error}</p>
        <button onClick={() => fetchData()} className="mt-3 text-xs text-red-300 underline">إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 overflow-hidden" dir="rtl">
      {/* ─── Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-black border border-white/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-white">حملات تيك توك</span>
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

      {/* ─── Stats Summary (آخر 30 يوم) ──────────────── */}
      {totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-white/10">
          {[
            { label: 'الإنفاق (30 يوم)', value: fmtNum(totals.spend, 0), sub: 'ر.س', color: 'text-orange-300' },
            { label: 'الظهور',           value: fmtNum(totals.impressions), sub: 'مرة', color: 'text-blue-300' },
            { label: 'النقرات',          value: fmtNum(totals.clicks), sub: 'نقرة', color: 'text-cyan-300' },
            { label: 'التحويلات',        value: fmtNum(totals.conversions), sub: 'تحويل', color: 'text-green-300' },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 rounded-xl p-3 border border-white/8">
              <p className="text-xs text-white/40 mb-1">{s.label}</p>
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-white/30">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─── جدول الحملات ────────────────────────────── */}
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
                <th className="text-center py-3 px-3">الهدف</th>
                <th className="text-center py-3 px-3">الميزانية</th>
                <th className="text-center py-3 px-3">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const statusInfo = getStatusInfo(c.operation_status || c.status);
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
                        {OBJECTIVE_MAP[c.objective_type] ?? c.objective_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-xs text-orange-300 font-medium">
                        {c.budget > 0 ? fmtNum(c.budget, 0) : '—'}
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
