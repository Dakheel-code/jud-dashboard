'use client';

import { useState, useEffect, useCallback } from 'react';
import { Campaign } from './types';
import AdSquadsDrawer from './AdSquadsDrawer';

const fmt = (n: number) => n > 0 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—';
const fmtSAR = (n: number) => n > 0 ? `${n.toLocaleString('en-US', { maximumFractionDigits: 0 })} ر.س` : '—';

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = {
    ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
    PAUSED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };
  const l: Record<string, string> = { ACTIVE: 'نشط', PAUSED: 'متوقف' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs border ${s[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
      {l[status] || status}
    </span>
  );
}

interface Summary {
  spend: number; impressions: number; swipes: number;
  orders: number; sales: number; roas: number;
}

interface Props {
  storeId: string;
  range: string;
}

export default function SnapchatCampaigns({ storeId, range }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`/api/stores/${storeId}/snapchat/campaigns?range=${range}&show_all=true`);
      const d = await r.json();
      if (d.success) {
        const all: Campaign[] = d.campaigns_all ?? d.campaigns_with_stats ?? [];
        setCampaigns(all);
        // حساب الظهور والضغطات من الحملات مباشرة (لأن الـ summary قد لا يحتوي عليها)
        const totalImpressions = all.reduce((s, c) => s + (c.impressions || 0), 0);
        const totalSwipes = all.reduce((s, c) => s + (c.swipes || 0), 0);
        setSummary({
          spend: d.summary?.spend || 0,
          impressions: totalImpressions,
          swipes: totalSwipes,
          orders: d.summary?.orders || 0,
          sales: d.summary?.sales || 0,
          roas: d.summary?.roas || 0,
        });
      } else {
        setError(d.error || 'فشل في جلب الحملات');
      }
    } catch {
      setError('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }, [storeId, range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleStatus = async (e: React.MouseEvent, campaign: Campaign) => {
    e.stopPropagation();
    setUpdatingId(campaign.campaign_id);
    try {
      const r = await fetch(`/api/admin/campaigns/${campaign.campaign_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, action: campaign.status === 'ACTIVE' ? 'pause' : 'resume' }),
      });
      const d = await r.json();
      setActionMsg({ type: d.success ? 'success' : 'error', text: d.message || d.error || 'خطأ' });
      if (d.success) fetchData();
    } catch {
      setActionMsg({ type: 'error', text: 'خطأ في الاتصال' });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setActionMsg(null), 3000);
    }
  };

  const filtered = campaigns.filter(c =>
    c.campaign_name.toLowerCase().includes(search.toLowerCase())
  );

  const summaryCards = summary ? [
    { label: 'الصرف', value: fmtSAR(summary.spend), cls: 'from-orange-500/20 to-orange-600/10 border-orange-500/20' },
    { label: 'الظهور', value: summary.impressions > 0 ? summary.impressions.toLocaleString('en-US') : '—', cls: 'from-blue-500/20 to-blue-600/10 border-blue-500/20' },
    { label: 'الضغطات', value: summary.swipes > 0 ? summary.swipes.toLocaleString('en-US') : '—', cls: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/20' },
    { label: 'الطلبات', value: summary.orders > 0 ? summary.orders.toLocaleString('en-US') : '—', cls: 'from-green-500/20 to-green-600/10 border-green-500/20' },
    { label: 'المبيعات', value: fmtSAR(summary.sales), cls: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20' },
    { label: 'ROAS', value: summary.roas > 0 ? `${summary.roas.toFixed(2)}x` : '—', cls: 'from-purple-500/20 to-purple-600/10 border-purple-500/20' },
  ] : [];

  return (
    <div className="space-y-5">
      {/* Toast */}
      {actionMsg && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[600] px-5 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all ${actionMsg.type === 'success' ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
          {actionMsg.text}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {summaryCards.map(({ label, value, cls }) => (
            <div key={label} className={`bg-gradient-to-br ${cls} rounded-xl p-4 border`}>
              <p className="text-xs text-white/50 mb-1">{label}</p>
              <p className="text-xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + Refresh */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث في الحملات..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-purple-900/30 border border-purple-500/20 text-white placeholder-purple-400 text-sm focus:outline-none focus:border-purple-500/50"
        />
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          تحديث
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="bg-purple-950/40 rounded-2xl border border-purple-500/20 overflow-hidden">
        <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">الحملات ({filtered.length})</h3>
          <p className="text-xs text-purple-400/60">اضغط على الحملة لعرض المجموعات الإعلانية ←</p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-purple-400 text-sm">جاري تحميل الحملات...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 text-sm hover:bg-purple-500/30 transition-colors">
              إعادة المحاولة
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-purple-400 text-sm">لا توجد حملات في هذه الفترة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-purple-400 text-xs border-b border-purple-500/20 bg-purple-900/20">
                  <th className="text-right py-3 px-4">الحملة</th>
                  <th className="text-center py-3 px-3">الحالة</th>
                  <th className="text-center py-3 px-3">الصرف</th>
                  <th className="text-center py-3 px-3">الظهور</th>
                  <th className="text-center py-3 px-3">الضغطات</th>
                  <th className="text-center py-3 px-3">الطلبات</th>
                  <th className="text-center py-3 px-3">ROAS</th>
                  <th className="text-center py-3 px-3">تحكم</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr
                    key={c.campaign_id}
                    className="border-t border-purple-500/10 hover:bg-purple-900/20 cursor-pointer transition-colors group"
                    onClick={() => setSelectedCampaign(c)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[180px] text-white font-medium group-hover:text-purple-300 transition-colors" title={c.campaign_name}>
                          {c.campaign_name}
                        </span>
                        <svg className="w-3.5 h-3.5 text-purple-500/40 group-hover:text-purple-400 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3 px-3 text-center text-orange-400 font-medium">{fmtSAR(c.spend)}</td>
                    <td className="py-3 px-3 text-center text-blue-300">{fmt(c.impressions)}</td>
                    <td className="py-3 px-3 text-center text-cyan-300">{fmt(c.swipes)}</td>
                    <td className="py-3 px-3 text-center text-green-400">{fmt(c.orders)}</td>
                    <td className={`py-3 px-3 text-center font-medium ${c.roas > 0 && c.roas < 1 ? 'text-red-400' : 'text-purple-300'}`}>
                      {c.roas > 0 ? `${c.roas.toFixed(2)}x` : '—'}
                    </td>
                    <td className="py-3 px-3 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => toggleStatus(e, c)}
                        disabled={updatingId === c.campaign_id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                          c.status === 'ACTIVE'
                            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30'
                            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                        }`}
                      >
                        {updatingId === c.campaign_id ? (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          </span>
                        ) : c.status === 'ACTIVE' ? 'إيقاف' : 'تشغيل'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ad Squads Drawer */}
      {selectedCampaign && (
        <AdSquadsDrawer
          storeId={storeId}
          campaign={selectedCampaign}
          range={range}
          onClose={() => setSelectedCampaign(null)}
        />
      )}
    </div>
  );
}
