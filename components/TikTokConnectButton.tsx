'use client';

import { useEffect, useState } from 'react';

interface TikTokConnection {
  advertiser_id: string;
  advertiser_name: string | null;
  connected_at: string;
}

interface Props {
  storeId: string;
}

export default function TikTokConnectButton({ storeId }: Props) {
  const [loading, setLoading]           = useState(true);
  const [connected, setConnected]       = useState(false);
  const [connections, setConnections]   = useState<TikTokConnection[]>([]);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tiktok/status?store_id=${storeId}`);
      const data = await res.json();
      setConnected(data.connected ?? false);
      setConnections(data.connections ?? []);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [storeId]);

  const handleConnect = () => {
    window.location.href = `/api/tiktok/auth?store_id=${storeId}`;
  };

  const handleDisconnect = async () => {
    if (!confirm('هل أنت متأكد من فصل ربط TikTok؟')) return;
    setDisconnecting(true);
    try {
      await fetch(`/api/tiktok/status?store_id=${storeId}`, { method: 'DELETE' });
      setConnected(false);
      setConnections([]);
    } catch {
    } finally {
      setDisconnecting(false);
    }
  };

  const handleReconnect = () => {
    window.location.href = `/api/tiktok/auth?store_id=${storeId}`;
  };

  // Skeleton loader
  if (loading) {
    return (
      <div className="rounded-xl border border-purple-500/20 p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-900/40" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-purple-900/40 rounded w-24" />
            <div className="h-3 bg-purple-900/30 rounded w-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${connected ? 'bg-white/5 border-white/20' : 'bg-purple-900/20 border-purple-500/20'}`}>
      <div className="p-4 flex items-center justify-between gap-3">
        {/* أيقونة TikTok */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${connected ? 'bg-black border border-white/20' : 'bg-purple-900/40 border border-purple-500/20'}`}>
            <svg className={`w-5 h-5 ${connected ? 'text-white' : 'text-gray-500'}`} viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">TikTok Ads</p>
            {connected ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                <span className="text-xs text-green-400 truncate">
                  {connections[0]?.advertiser_name || connections[0]?.advertiser_id || 'متصل'}
                </span>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">غير مرتبط</p>
            )}
          </div>
        </div>

        {/* الأزرار */}
        <div className="flex items-center gap-2 shrink-0">
          {connected ? (
            <>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
              >
                {disconnecting ? '...' : 'فصل'}
              </button>
              <button
                onClick={handleReconnect}
                className="px-3 py-1.5 text-xs rounded-lg bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
              >
                إعادة الربط
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg bg-black border border-white/20 text-white hover:bg-gray-900 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z" />
              </svg>
              ربط تيك توك
            </button>
          )}
        </div>
      </div>

      {/* الحسابات الإعلانية المرتبطة */}
      {connected && connections.length > 1 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {connections.map((c) => (
            <span
              key={c.advertiser_id}
              className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/15 text-white/70"
            >
              {c.advertiser_name || c.advertiser_id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
