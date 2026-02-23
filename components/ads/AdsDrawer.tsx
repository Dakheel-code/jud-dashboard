'use client';

import { useState, useEffect } from 'react';
import AdPreviewModal from './AdPreviewModal';
import { Ad, Campaign, AdSquad } from './types';

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
  squad: AdSquad;
  onClose: () => void;
}

export default function AdsDrawer({ storeId, campaign, squad, onClose }: Props) {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewAd, setPreviewAd] = useState<Ad | null>(null);

  useEffect(() => {
    fetch(`/api/stores/${storeId}/snapchat/campaigns/${campaign.campaign_id}/ads`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setAds((d.ads || []).filter((a: Ad) => a.ad_squad_id === squad.id));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId, campaign.campaign_id, squad.id]);

  return (
    <>
      <div className="fixed inset-0 z-[400] flex">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative mr-auto w-full max-w-2xl bg-[#0d0520] border-r border-purple-500/20 h-full overflow-y-auto shadow-2xl flex flex-col">

          {/* Header */}
          <div className="sticky top-0 z-10 bg-[#0d0520]/95 backdrop-blur border-b border-purple-500/20 p-4 flex items-center gap-3">
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-purple-500/20 text-purple-400 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-purple-400 truncate">{campaign.campaign_name} › {squad.name}</p>
              <h2 className="text-white font-bold text-sm">الإعلانات ({ads.length})</h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              </div>
            ) : ads.length === 0 ? (
              <div className="text-center py-16 text-purple-400 text-sm">لا توجد إعلانات في هذه المجموعة</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ads.map(ad => (
                  <div key={ad.id} className="bg-purple-900/20 border border-purple-500/20 rounded-xl overflow-hidden hover:border-purple-500/40 transition-all">
                    {/* Thumbnail */}
                    <div
                      className="relative aspect-[9/16] bg-purple-950/50 cursor-pointer group"
                      onClick={() => setPreviewAd(ad)}
                    >
                      {ad.thumbnail_url ? (
                        <img src={ad.thumbnail_url} alt={ad.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-purple-500/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {ad.media_type === 'VIDEO' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 bg-black/50 rounded-full flex items-center justify-center group-hover:bg-black/70 transition-colors">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
                        <span className="text-white text-xs bg-purple-600 px-2 py-0.5 rounded-full">عرض المحتوى</span>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-2">
                      <p className="text-white text-xs font-medium truncate">{ad.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <StatusBadge status={ad.status} />
                        <span className="text-xs text-purple-400/60">{ad.media_type === 'VIDEO' ? '🎬' : '🖼️'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {previewAd && <AdPreviewModal ad={previewAd} onClose={() => setPreviewAd(null)} />}
    </>
  );
}
