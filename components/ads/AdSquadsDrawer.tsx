'use client';

import { useState, useEffect } from 'react';
import { Campaign, AdSquad } from './types';
import AdsDrawer from './AdsDrawer';

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

interface Props {
  storeId: string;
  campaign: Campaign;
  range: string;
  onClose: () => void;
}

export default function AdSquadsDrawer({ storeId, campaign, range, onClose }: Props) {
  const [squads, setSquads] = useState<AdSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSquad, setSelectedSquad] = useState<AdSquad | null>(null);

  useEffect(() => {
    fetch(`/api/stores/${storeId}/snapchat/campaigns/${campaign.campaign_id}/adsquads?range=${range}`)
      .then(r => r.json())
      .then(d => { if (d.success) setSquads(d.ad_squads || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId, campaign.campaign_id, range]);

  if (selectedSquad) {
    return (
      <AdsDrawer
        storeId={storeId}
        campaign={campaign}
        squad={selectedSquad}
        onClose={() => setSelectedSquad(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[300] flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mr-auto w-full max-w-2xl bg-[#0d0520] border-r border-purple-500/20 h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0d0520]/95 backdrop-blur border-b border-purple-500/20 p-4 flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-purple-500/20 text-purple-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-purple-400 truncate">{campaign.campaign_name}</p>
            <h2 className="text-white font-bold text-sm">المجموعات الإعلانية ({squads.length})</h2>
          </div>
          <StatusBadge status={campaign.status} />
        </div>

        {/* Campaign Stats */}
        <div className="p-4 border-b border-purple-500/10 grid grid-cols-4 gap-2">
          <div className="bg-orange-500/10 rounded-lg p-2 text-center">
            <p className="text-orange-400/70 text-xs">الصرف</p>
            <p className="text-white font-bold text-sm mt-0.5">{fmtSAR(campaign.spend)}</p>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-2 text-center">
            <p className="text-blue-400/70 text-xs">الظهور</p>
            <p className="text-white font-bold text-sm mt-0.5">{fmt(campaign.impressions)}</p>
          </div>
          <div className="bg-cyan-500/10 rounded-lg p-2 text-center">
            <p className="text-cyan-400/70 text-xs">الضغطات</p>
            <p className="text-white font-bold text-sm mt-0.5">{fmt(campaign.swipes)}</p>
          </div>
          <div className="bg-purple-500/10 rounded-lg p-2 text-center">
            <p className="text-purple-400/70 text-xs">ROAS</p>
            <p className={`font-bold text-sm mt-0.5 ${campaign.roas > 0 && campaign.roas < 1 ? 'text-red-400' : 'text-white'}`}>
              {campaign.roas > 0 ? `${campaign.roas.toFixed(2)}x` : '—'}
            </p>
          </div>
        </div>

        {/* Squads List */}
        <div className="p-4 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : squads.length === 0 ? (
            <div className="text-center py-16 text-purple-400 text-sm">لا توجد مجموعات إعلانية</div>
          ) : (
            <div className="space-y-3">
              {squads.map(sq => (
                <button
                  key={sq.id}
                  onClick={() => setSelectedSquad(sq)}
                  className="w-full text-right bg-purple-900/20 hover:bg-purple-900/40 border border-purple-500/20 hover:border-purple-500/50 rounded-xl p-4 transition-all group"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{sq.name}</p>
                      <div className="mt-1"><StatusBadge status={sq.status} /></div>
                    </div>
                    <div className="flex items-center gap-1 text-purple-400 group-hover:text-purple-300 text-xs shrink-0">
                      <span>الإعلانات</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="bg-orange-500/10 rounded-lg p-2 text-center">
                      <p className="text-orange-400/70">الصرف</p>
                      <p className="text-white font-bold mt-0.5">{fmtSAR(sq.spend)}</p>
                    </div>
                    <div className="bg-blue-500/10 rounded-lg p-2 text-center">
                      <p className="text-blue-400/70">الظهور</p>
                      <p className="text-white font-bold mt-0.5">{fmt(sq.impressions)}</p>
                    </div>
                    <div className="bg-cyan-500/10 rounded-lg p-2 text-center">
                      <p className="text-cyan-400/70">الضغطات</p>
                      <p className="text-white font-bold mt-0.5">{fmt(sq.swipes)}</p>
                    </div>
                    <div className="bg-purple-500/10 rounded-lg p-2 text-center">
                      <p className="text-purple-400/70">ROAS</p>
                      <p className={`font-bold mt-0.5 ${sq.roas > 0 && sq.roas < 1 ? 'text-red-400' : 'text-white'}`}>
                        {sq.roas > 0 ? `${sq.roas.toFixed(2)}x` : '—'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
