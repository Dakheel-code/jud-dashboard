'use client';

import { useState, useEffect, useCallback } from 'react';
import { Campaign, AdSquad, Ad } from './types';
import AdPreviewModal from './AdPreviewModal';

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

// ─── Ad Squads Accordion Row ─────────────────────────────────────────────────
function AdSquadsRow({ storeId, campaign, range }: { storeId: string; campaign: Campaign; range: string }) {
  const [squads, setSquads] = useState<AdSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSquad, setExpandedSquad] = useState<string | null>(null);
  const [adsMap, setAdsMap] = useState<Record<string, Ad[]>>({});
  const [adsLoading, setAdsLoading] = useState<string | null>(null);
  const [previewAd, setPreviewAd] = useState<Ad | null>(null);

  useEffect(() => {
    fetch(`/api/stores/${storeId}/snapchat/campaigns/${campaign.campaign_id}/adsquads?range=${range}`)
      .then(r => r.json())
      .then(d => { if (d.success) setSquads(d.ad_squads || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId, campaign.campaign_id, range]);

  const loadAds = async (squadId: string) => {
    if (adsMap[squadId]) { setExpandedSquad(squadId); return; }
    setAdsLoading(squadId);
    try {
      const r = await fetch(`/api/stores/${storeId}/snapchat/campaigns/${campaign.campaign_id}/ads`);
      const d = await r.json();
      if (d.success) {
        const filtered = (d.ads || []).filter((a: Ad) => a.ad_squad_id === squadId);
        setAdsMap(prev => ({ ...prev, [squadId]: filtered }));
      }
    } catch {}
    finally { setAdsLoading(null); setExpandedSquad(squadId); }
  };

  const toggleSquad = (squadId: string) => {
    if (expandedSquad === squadId) { setExpandedSquad(null); return; }
    loadAds(squadId);
  };

  return (
    <>
      <tr>
        <td colSpan={8} className="p-0">
          <div className="bg-purple-950/60 border-t border-b border-purple-500/20">
            {loading ? (
              <div className="flex items-center gap-2 px-6 py-4 text-purple-400 text-sm">
                <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                جاري تحميل المجموعات...
              </div>
            ) : squads.length === 0 ? (
              <div className="px-6 py-4 text-purple-400/60 text-sm">لا توجد مجموعات إعلانية لهذه الحملة</div>
            ) : (
              <div className="divide-y divide-purple-500/10">
                {squads.map(sq => (
                  <div key={sq.id}>
                    {/* Squad Row */}
                    <button
                      onClick={() => toggleSquad(sq.id)}
                      className="w-full text-right px-6 py-3 hover:bg-purple-900/30 transition-colors flex items-center gap-3"
                    >
                      <svg
                        className={`w-4 h-4 text-purple-400 shrink-0 transition-transform ${expandedSquad === sq.id ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      <div className="flex-1 grid grid-cols-7 gap-2 items-center text-xs">
                        <div className="col-span-2 text-right">
                          <p className="text-white font-medium truncate">{sq.name}</p>
                          <div className="mt-0.5"><StatusBadge status={sq.status} /></div>
                        </div>
                        <div className="text-center text-orange-400 font-medium">{fmtSAR(sq.spend)}</div>
                        <div className="text-center text-blue-300">{fmt(sq.impressions)}</div>
                        <div className="text-center text-cyan-300">{fmt(sq.swipes)}</div>
                        <div className="text-center text-green-400">{fmt(sq.orders)}</div>
                        <div className={`text-center font-medium ${sq.roas > 0 && sq.roas < 1 ? 'text-red-400' : 'text-purple-300'}`}>
                          {sq.roas > 0 ? `${sq.roas.toFixed(2)}x` : '—'}
                        </div>
                      </div>
                      {adsLoading === sq.id && (
                        <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin shrink-0" />
                      )}
                    </button>

                    {/* Ads Grid */}
                    {expandedSquad === sq.id && (
                      <div className="px-6 pb-4 pt-2 bg-purple-950/40">
                        {!adsMap[sq.id] || adsMap[sq.id].length === 0 ? (
                          <p className="text-purple-400/60 text-xs py-2">لا توجد إعلانات في هذه المجموعة</p>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {adsMap[sq.id].map(ad => (
                              <div
                                key={ad.id}
                                className="cursor-pointer group"
                                onClick={() => setPreviewAd(ad)}
                              >
                                <div className="relative aspect-[9/16] bg-purple-900/40 rounded-lg overflow-hidden border border-purple-500/20 group-hover:border-purple-400/50 transition-all">
                                  {ad.thumbnail_url ? (
                                    <img src={ad.thumbnail_url} alt={ad.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <svg className="w-6 h-6 text-purple-500/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  )}
                                  {ad.media_type === 'VIDEO' && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-7 h-7 bg-black/60 rounded-full flex items-center justify-center">
                                        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                      </div>
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="text-white text-[10px] bg-purple-600 px-1.5 py-0.5 rounded-full">عرض</span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-purple-400/70 truncate mt-1 text-center">{ad.name}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </td>
      </tr>
      {previewAd && <AdPreviewModal ad={previewAd} onClose={() => setPreviewAd(null)} />}
    </>
  );
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
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
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

  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaign(prev => prev === campaignId ? null : campaignId);
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
          <p className="text-xs text-purple-400/60">↓ اضغط على الحملة لعرض المجموعات الإعلانية</p>
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
                  <>
                    <tr
                      key={c.campaign_id}
                      className={`border-t border-purple-500/10 cursor-pointer transition-colors group ${
                        expandedCampaign === c.campaign_id ? 'bg-purple-900/30' : 'hover:bg-purple-900/20'
                      }`}
                      onClick={() => toggleCampaign(c.campaign_id)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <svg
                            className={`w-4 h-4 text-purple-400 shrink-0 transition-transform ${
                              expandedCampaign === c.campaign_id ? 'rotate-180' : ''
                            }`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          <span className="truncate max-w-[180px] text-white font-medium group-hover:text-purple-300 transition-colors" title={c.campaign_name}>
                            {c.campaign_name}
                          </span>
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
                            <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          ) : c.status === 'ACTIVE' ? 'إيقاف' : 'تشغيل'}
                        </button>
                      </td>
                    </tr>
                    {expandedCampaign === c.campaign_id && (
                      <AdSquadsRow
                        key={`squads-${c.campaign_id}`}
                        storeId={storeId}
                        campaign={c}
                        range={range}
                      />
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
