'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useBranding } from '@/contexts/BrandingContext';
import dynamic from 'next/dynamic';

const SnapchatCampaigns = dynamic(
  () => import('@/components/ads/SnapchatCampaigns'),
  { ssr: false, loading: () => <LoadingSpinner /> }
);
const MetaAdsCard = dynamic(
  () => import('@/components/MetaAdsCard'),
  { ssr: false, loading: () => <LoadingSpinner /> }
);
const TikTokCampaigns = dynamic(
  () => import('@/components/TikTokCampaigns'),
  { ssr: false, loading: () => <LoadingSpinner /> }
);
const GoogleAdsCampaigns = dynamic(
  () => import('@/components/GoogleAdsCampaigns'),
  { ssr: false, loading: () => <LoadingSpinner /> }
);

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
    </div>
  );
}

interface Store { id: string; store_name: string; store_url: string; }

type Platform = 'snapchat' | 'meta' | 'tiktok' | 'google';
type Range = 'today' | 'yesterday' | '7d' | '30d' | '90d';

const PLATFORMS: { key: Platform; label: string; color: string }[] = [
  { key: 'snapchat', label: '👻 Snapchat', color: 'yellow' },
  { key: 'meta', label: '📘 Meta Ads', color: 'blue' },
  { key: 'tiktok', label: '🎵 TikTok', color: 'pink' },
  { key: 'google', label: '🔍 Google Ads', color: 'green' },
];

const RANGES: { key: Range; label: string }[] = [
  { key: 'today', label: 'اليوم' },
  { key: 'yesterday', label: 'أمس' },
  { key: '7d', label: '7 أيام' },
  { key: '30d', label: '30 يوم' },
  { key: '90d', label: '90 يوم' },
];

function CampaignsContent() {
  const { branding } = useBranding();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [storeSearch, setStoreSearch] = useState('');
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [activePlatform, setActivePlatform] = useState<Platform>('snapchat');
  const [range, setRange] = useState<Range>('7d');

  // Load stores
  useEffect(() => {
    fetch('/api/admin/stores')
      .then(r => r.json())
      .then(d => { if (d.stores) setStores(d.stores); })
      .catch(() => {})
      .finally(() => setLoadingStores(false));
  }, []);

  // Restore selected store from URL or localStorage
  useEffect(() => {
    const urlStoreId = searchParams.get('storeId');
    if (urlStoreId) {
      setSelectedStoreId(urlStoreId);
      localStorage.setItem('lastSelectedStoreId', urlStoreId);
    } else {
      const saved = localStorage.getItem('lastSelectedStoreId');
      if (saved) setSelectedStoreId(saved);
    }
  }, [searchParams]);

  const handleStoreSelect = (store: Store) => {
    setSelectedStoreId(store.id);
    localStorage.setItem('lastSelectedStoreId', store.id);
    setShowStoreDropdown(false);
    setStoreSearch('');
    router.push(`/admin/campaigns?storeId=${store.id}`);
  };

  const selectedStore = stores.find(s => s.id === selectedStoreId);
  const filteredStores = stores.filter(s =>
    s.store_name.toLowerCase().includes(storeSearch.toLowerCase()) ||
    s.store_url.toLowerCase().includes(storeSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0118] pb-20 lg:pb-8">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          {branding.logo && (
            <img src={branding.logo} alt="" className="w-14 h-14 object-contain" />
          )}
          <div className="h-12 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent" />
          <div>
            <h1 className="text-2xl text-white font-black">الحملات الإعلانية</h1>
            <p className="text-purple-300/60 text-sm mt-0.5">إدارة ومتابعة الحملات الإعلانية</p>
          </div>
        </div>

        {/* Store Selector */}
        <div className="bg-purple-950/40 rounded-2xl border border-purple-500/20 p-4 mb-6 relative z-50">
          <label className="block text-xs text-purple-400 mb-2">المتجر</label>
          <div className="relative inline-block w-full md:w-auto">
            <button
              onClick={() => setShowStoreDropdown(v => !v)}
              className="w-full md:w-96 px-4 py-3 rounded-xl bg-purple-900/30 border border-purple-500/30 text-white text-right flex items-center justify-between hover:bg-purple-900/50 transition-colors"
            >
              {loadingStores ? (
                <span className="text-purple-400 text-sm">جاري التحميل...</span>
              ) : selectedStore ? (
                <span>
                  <span className="font-medium">{selectedStore.store_name}</span>
                  <span className="text-purple-400 text-sm mr-2">({selectedStore.store_url})</span>
                </span>
              ) : (
                <span className="text-purple-400 text-sm">اختر متجر...</span>
              )}
              <svg className={`w-4 h-4 text-purple-400 transition-transform shrink-0 mr-2 ${showStoreDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showStoreDropdown && (
              <div className="absolute z-50 mt-1 w-full md:w-96 bg-[#1a0a2e] border border-purple-500/30 rounded-xl shadow-2xl overflow-hidden">
                <div className="p-2 border-b border-purple-500/20">
                  <input
                    type="text"
                    value={storeSearch}
                    onChange={e => setStoreSearch(e.target.value)}
                    placeholder="بحث..."
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg bg-purple-900/30 border border-purple-500/20 text-white placeholder-purple-400 text-sm focus:outline-none"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredStores.length === 0 ? (
                    <div className="p-4 text-center text-purple-400 text-sm">لا توجد نتائج</div>
                  ) : filteredStores.map(store => (
                    <button
                      key={store.id}
                      onClick={() => handleStoreSelect(store)}
                      className={`w-full px-4 py-3 text-right hover:bg-purple-800/40 transition-colors ${store.id === selectedStoreId ? 'bg-purple-800/30' : ''}`}
                    >
                      <div className="font-medium text-white text-sm">{store.store_name}</div>
                      <div className="text-xs text-purple-400 mt-0.5">{store.store_url}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedStoreId && (
          <>
            {/* Platform + Range Tabs */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {/* Platforms */}
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActivePlatform(key)}
                    className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                      activePlatform === key
                        ? 'bg-purple-500/30 border-purple-400/50 text-white'
                        : 'bg-purple-900/20 border-purple-500/20 text-purple-400/70 hover:border-purple-500/40 hover:text-purple-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Range (only for Snapchat) */}
              {activePlatform === 'snapchat' && (
                <div className="flex gap-1.5 bg-purple-900/30 rounded-xl p-1 border border-purple-500/20">
                  {RANGES.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setRange(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        range === key
                          ? 'bg-purple-500/40 text-white'
                          : 'text-purple-400/70 hover:text-purple-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Platform Content */}
            {activePlatform === 'snapchat' && (
              <SnapchatCampaigns storeId={selectedStoreId} range={range} />
            )}
            {activePlatform === 'meta' && (
              <MetaAdsCard storeId={selectedStoreId} embedded />
            )}
            {activePlatform === 'tiktok' && (
              <TikTokCampaigns storeId={selectedStoreId} />
            )}
            {activePlatform === 'google' && (
              <GoogleAdsCampaigns storeId={selectedStoreId} />
            )}
          </>
        )}

        {!selectedStoreId && !loadingStores && (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-purple-400/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-purple-400/60 text-lg">اختر متجراً لعرض الحملات الإعلانية</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CampaignsClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
      </div>
    }>
      <CampaignsContent />
    </Suspense>
  );
}
