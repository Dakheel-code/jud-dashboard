'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const MetaAdsCard = dynamic<{ storeId: string; embedded?: boolean; onSummaryLoaded?: (s: any) => void; externalPreset?: string }>(
  () => import('@/components/MetaAdsCard'), { ssr: false }
);

const GoogleAdsConnectButton = dynamic<{ storeId: string }>(
  () => import('@/components/GoogleAdsConnectButton'), { ssr: false }
);

function GoogleAdsInlineButton({ storeId }: { storeId: string }) {
  const [showModal, setShowModal] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [form, setForm] = React.useState({
    customer_id: '', client_id: '', client_secret: '',
    developer_token: '', refresh_token: '', manager_id: '',
  });

  React.useEffect(() => {
    fetch('/api/google-ads/default-creds')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setForm(p => ({ ...p, ...d })); })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/google-ads/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'فشل في الربط'); }
      else { setSuccess(true); setTimeout(() => { setShowModal(false); window.location.reload(); }, 1500); }
    } catch { setError('خطأ في الاتصال'); }
    finally { setSubmitting(false); }
  };

  const hasEnvCreds = !!(form.client_id && form.client_secret && form.developer_token && form.refresh_token);

  const FIELDS = [
    { key: 'customer_id',     label: 'Customer ID',     type: 'text',     required: true,  alwaysShow: true },
    { key: 'client_id',       label: 'Client ID',       type: 'text',     required: true,  alwaysShow: false },
    { key: 'client_secret',   label: 'Client Secret',   type: 'password', required: true,  alwaysShow: false },
    { key: 'developer_token', label: 'Developer Token', type: 'password', required: true,  alwaysShow: false },
    { key: 'refresh_token',   label: 'Refresh Token',   type: 'password', required: true,  alwaysShow: false },
    { key: 'manager_id',      label: 'Manager ID (اختياري)', type: 'text', required: false, alwaysShow: false },
  ].filter(f => f.alwaysShow || !hasEnvCreds);

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setShowModal(true); setError(null); setSuccess(false); }}
        className="text-xs px-2 py-0.5 bg-green-500/20 border border-green-500/30 text-green-300 rounded-lg hover:bg-green-500/40 transition-all">
        ربط
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-[#1a0a2e] border border-green-500/30 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-gray-200">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-white">ربط Google Ads</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-purple-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {success ? (
              <div className="py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-400 font-bold">تم الربط بنجاح!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                  <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">⚠️ {error}</div>
                )}
                {FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-purple-300 mb-1">{f.label}</label>
                    <input
                      type={f.type}
                      value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      required={f.required}
                      className="w-full px-3 py-2 text-sm bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-1 focus:ring-green-500 outline-none"
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>جاري...</> : 'ربط Google Ads'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-sm rounded-xl bg-purple-900/40 border border-purple-500/20 text-purple-300 hover:bg-purple-900/60">
                    إلغاء
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

interface SnapchatCampaignsSectionProps {
  storeId: string | null;
  directIntegrations: Record<string, { status: string; ad_account_id?: string; ad_account_name?: string }>;
  onDataLoaded?: (summary: { spend: number; orders: number; sales: number; roas: number } | null) => void;
  onConnectClick?: () => void;
}

interface PlatformRow {
  key: string;
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  accountName?: string;
  spend: number;
  sales: number;
  orders: number;
  roas: number;
  loading: boolean;
}

const DATE_PRESETS = [
  { label: 'اليوم',   value: 'today' },
  { label: 'أمس',    value: 'yesterday' },
  { label: '7 أيام', value: '7d' },
  { label: '30 يوم', value: '30d' },
  { label: '90 يوم', value: '90d' },
];

const ALL_PLATFORMS = ['snapchat', 'meta', 'google', 'tiktok'];

function SnapIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 512 512" fill="currentColor">
      <path d="M496.926,366.6c-3.373-9.176-9.8-14.086-17.112-18.153-1.376-.806-2.641-1.451-3.72-1.947-2.182-1.128-4.414-2.22-6.634-3.373-22.8-12.09-40.609-27.341-52.959-45.42a102.889,102.889,0,0,1-9.089-16.269c-1.054-2.766-.992-4.377-.065-5.954a11.249,11.249,0,0,1,3.088-2.818c2.766-1.8,5.669-3.373,8.2-4.7,4.7-2.5,8.5-4.5,10.9-5.954,7.287-4.477,12.5-9.4,15.5-14.629a24.166,24.166,0,0,0,1.863-22.031c-4.328-12.266-17.9-19.263-28.263-19.263a35.007,35.007,0,0,0-9.834,1.376c-.124.037-.236.074-.347.111,0-1.451.024-2.915.024-4.377,0-22.92-2.508-46.152-10.9-67.615C378.538,91.727,341.063,56.7,286.741,50.6a118.907,118.907,0,0,0-12.293-.621h-36.9a118.907,118.907,0,0,0-12.293.621c-54.31,6.1-91.785,41.127-110.839,84.168-8.4,21.463-10.9,44.7-10.9,67.615,0,1.462.012,2.926.024,4.377-.111-.037-.223-.074-.347-.111a35.007,35.007,0,0,0-9.834-1.376c-10.362,0-23.935,7-28.263,19.263a24.166,24.166,0,0,0,1.863,22.031c3,5.233,8.213,10.152,15.5,14.629,2.4,1.451,6.2,3.46,10.9,5.954,2.52,1.327,5.418,2.9,8.181,4.7a11.3,11.3,0,0,1,3.088,2.818c.927,1.576.989,3.187-.065,5.954a102.889,102.889,0,0,1-9.089,16.269c-12.35,18.079-30.161,33.33-52.959,45.42-2.22,1.153-4.452,2.245-6.634,3.373-1.079.5-2.344,1.141-3.72,1.947-7.312,4.067-13.739,8.977-17.112,18.153-3.6,9.834-1.044,20.882,7.6,32.838a71.2,71.2,0,0,0,33.787,19.016c4.278.2,8.7-.161,13.168-.533,3.9-.322,7.9-.657,11.778-.657a53.666,53.666,0,0,1,9.725.806c.682,1.054,1.376,2.182,2.108,3.4,4.7,7.823,11.168,18.54,24.077,29.2,13.8,11.4,32.018,21.041,57.271,28.489a12.478,12.478,0,0,1,3.633,1.54c3.088,4.278,8.083,7.947,15.259,11.242,8.362,3.844,18.8,6.746,31.1,8.635a245.762,245.762,0,0,0,37.238,2.817c12.8,0,25.371-.918,37.238-2.817,12.3-1.889,22.738-4.791,31.1-8.635,7.176-3.3,12.171-6.964,15.259-11.242a12.478,12.478,0,0,1,3.633-1.54c25.253-7.448,43.469-17.087,57.271-28.489,12.909-10.659,19.375-21.376,24.077-29.2.732-1.215,1.426-2.344,2.108-3.4a53.666,53.666,0,0,1,9.725-.806c3.881,0,7.874.335,11.778.657,4.464.372,8.89.732,13.168.533a71.2,71.2,0,0,0,33.787-19.016C497.97,387.482,500.527,376.434,496.926,366.6Z"/>
    </svg>
  );
}
function MetaIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 008.44-9.9c0-5.53-4.5-10.02-10-10.02z"/>
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
function TikTokIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
    </svg>
  );
}

const PLATFORM_CONFIG: Record<string, { name: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  snapchat: { name: 'Snapchat',   icon: <SnapIcon />,   color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  meta:     { name: 'Meta Ads',   icon: <MetaIcon />,   color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
  google:   { name: 'Google Ads', icon: <GoogleIcon />, color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30' },
  tiktok:   { name: 'TikTok',     icon: <TikTokIcon />, color: 'text-white',      bg: 'bg-white/5',       border: 'border-white/20' },
};

function fmtNum(n: number) { return n.toLocaleString('en-US', { maximumFractionDigits: 0 }); }

export default function SnapchatCampaignsSection({ storeId, directIntegrations, onDataLoaded, onConnectClick }: SnapchatCampaignsSectionProps) {
  const [isCollapsed, setIsCollapsed]   = useState(false);
  const [datePreset, setDatePreset]     = useState('7d');
  const [activePlatforms, setActivePlatforms] = useState<Set<string>>(new Set(ALL_PLATFORMS));
  const [snapData, setSnapData]         = useState<{ spend: number; sales: number; orders: number; roas: number } | null>(null);
  const [metaData, setMetaData]         = useState<{ spend: number; sales: number; orders: number; roas: number } | null>(null);
  const [snapLoading, setSnapLoading]   = useState(false);
  const [snapCampaigns, setSnapCampaigns] = useState<any[]>([]);
  const [snapWarning, setSnapWarning]     = useState<string | null>(null);
  const [snapTime, setSnapTime]           = useState<any | null>(null);
  const [snapCoverage, setSnapCoverage]   = useState<{ stats_rows: number; returned_with_stats: number; returned_all: number } | null>(null);
  const [snapShowAll, setSnapShowAll]     = useState(false);
  const [snapAllCampaigns, setSnapAllCampaigns] = useState<any[]>([]);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const snapAbortRef = useRef<AbortController | null>(null);
  const directIntRef = useRef(directIntegrations);
  useEffect(() => { directIntRef.current = directIntegrations; }, [directIntegrations]);

  // ─── Google Ads Connection State ──────────────────────
  const [googleAdsConnected, setGoogleAdsConnected] = useState(false);
  const [googleAdsAccountName, setGoogleAdsAccountName] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!storeId) return;
    fetch(`/api/google-ads/status?store_id=${storeId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.connected) {
          setGoogleAdsConnected(true);
          setGoogleAdsAccountName(d.connections?.[0]?.customer_name || d.connections?.[0]?.customer_id);
        }
      })
      .catch(() => {});
  }, [storeId]);

  // ─── Meta Ad Account Modal ───────────────────────────
  const searchParams = useSearchParams();
  const [metaModal, setMetaModal]           = useState(false);
  const [metaAccounts, setMetaAccounts]     = useState<{ id: string; name: string; currency: string }[]>([]);
  const [metaAccLoading, setMetaAccLoading] = useState(false);
  const [metaSelected, setMetaSelected]     = useState('');
  const [metaSaving, setMetaSaving]         = useState(false);
  const [metaConn, setMetaConn]             = useState<{ status: string; ad_account_id?: string; ad_account_name?: string; meta_user_name?: string } | null>(null);
  const [metaSearch, setMetaSearch]         = useState('');

  const fetchMetaConn = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await fetch(`/api/meta/connection?storeId=${storeId}`);
      if (res.ok) { const d = await res.json(); setMetaConn(d.connection || null); }
    } catch { /* silent */ }
  }, [storeId]);

  const loadMetaAccounts = async () => {
    setMetaAccLoading(true);
    try {
      const res = await fetch(`/api/meta/adaccounts?storeId=${storeId}`);
      const d = await res.json(); setMetaAccounts(d.accounts || []);
    } catch { setMetaAccounts([]); }
    finally { setMetaAccLoading(false); }
  };

  const saveMetaAccount = async () => {
    if (!metaSelected) return;
    const acc = metaAccounts.find(a => a.id === metaSelected);
    setMetaSaving(true);
    try {
      const res = await fetch('/api/meta/select-adaccount', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, ad_account_id: acc?.id, ad_account_name: acc?.name }),
      });
      if (res.ok) {
        setMetaModal(false);
        setMetaAccounts([]);
        setMetaSelected('');
        await fetchMetaConn();
        // مسح param من URL
        const url = new URL(window.location.href);
        url.searchParams.delete('meta_connected');
        window.history.replaceState({}, '', url.toString());
      }
    } finally { setMetaSaving(false); }
  };

  // فتح Modal تلقائياً عند meta_connected=1
  useEffect(() => {
    fetchMetaConn();
  }, [fetchMetaConn]);

  useEffect(() => {
    if (searchParams?.get('meta_connected') === '1' && storeId) {
      setMetaModal(true);
      loadMetaAccounts();
    }
  }, [searchParams, storeId]);

  // جلب بيانات Snapchat — يستخدم ref لـ directIntegrations لمنع إعادة الإنشاء
  const fetchSnap = useCallback(async (preset: string) => {
    if (!storeId) return;
    const snapInt = directIntRef.current?.snapchat;
    if (!snapInt || snapInt.status !== 'connected' || !snapInt.ad_account_id) return;

    snapAbortRef.current?.abort();
    const controller = new AbortController();
    snapAbortRef.current = controller;

    setSnapLoading(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/snapchat/campaigns?range=${preset}`, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const d = await res.json();
      const s = {
        spend:  d.summary?.spend  || 0,
        sales:  d.summary?.sales  || 0,
        orders: d.summary?.orders || 0,
        roas:   d.summary?.roas   || 0,
      };
      setSnapData(s);
      setSnapCampaigns(d.campaigns_with_stats ?? []);
      setSnapAllCampaigns(d.campaigns_all ?? d.campaigns_with_stats ?? []);
      setSnapWarning(d.warning ?? null);
      setSnapTime(d.time ?? null);
      setSnapCoverage(d.coverage ?? null);
      if (d.success) onDataLoaded?.(s);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setSnapData({ spend: 0, sales: 0, orders: 0, roas: 0 });
        setSnapCampaigns([]);
        setSnapAllCampaigns([]);
        setSnapWarning(null);
        setSnapTime(null);
        setSnapCoverage(null);
      }
    } finally {
      if (!controller.signal.aborted) setSnapLoading(false);
    }
  }, [storeId]);

  // عند تغيير الفترة: مسح Snapchat فقط (ليس Meta)
  useEffect(() => {
    setSnapData(null);
    setSnapCampaigns([]);
    setSnapAllCampaigns([]);
    setSnapWarning(null);
    setSnapTime(null);
    setSnapCoverage(null);
    setSnapShowAll(false);
    fetchSnap(datePreset);
  }, [datePreset, fetchSnap]);

  // حساب الإجماليات
  const totalSpend  = (snapData?.spend  || 0) + (metaData?.spend  || 0);
  const totalSales  = (snapData?.sales  || 0) + (metaData?.sales  || 0);
  const totalOrders = (snapData?.orders || 0) + (metaData?.orders || 0);
  const totalRoas   = totalSpend > 0 ? totalSales / totalSpend : 0;

  // المنصات المتصلة
  const snapConnected = directIntegrations?.snapchat?.status === 'connected' && !!directIntegrations?.snapchat?.ad_account_id;
  const metaConnected = !!metaConn?.ad_account_id && (metaConn?.status === 'active' || metaConn?.status === 'connected');
  const connectedCount = [snapConnected, metaConnected, googleAdsConnected].filter(Boolean).length;

  // بناء صفوف الجدول
  const rows: PlatformRow[] = ALL_PLATFORMS.map(key => {
    const cfg = PLATFORM_CONFIG[key];
    if (key === 'snapchat') return {
      key, name: cfg.name, icon: cfg.icon,
      connected: snapConnected,
      accountName: directIntegrations?.snapchat?.ad_account_name,
      spend: snapData?.spend || 0, sales: snapData?.sales || 0,
      orders: snapData?.orders || 0, roas: snapData?.roas || 0,
      loading: snapLoading,
    };
    if (key === 'meta') return {
      key, name: cfg.name, icon: cfg.icon,
      connected: metaConnected,
      accountName: directIntegrations?.meta?.ad_account_name,
      spend: metaData?.spend || 0, sales: metaData?.sales || 0,
      orders: metaData?.orders || 0, roas: metaData?.roas || 0,
      loading: false,
    };
    if (key === 'google') return {
      key, name: cfg.name, icon: cfg.icon,
      connected: googleAdsConnected,
      accountName: googleAdsAccountName,
      spend: 0, sales: 0, orders: 0, roas: 0, loading: false,
    };
    return { key, name: cfg.name, icon: cfg.icon, connected: false, spend: 0, sales: 0, orders: 0, roas: 0, loading: false };
  });

  const filteredRows = rows.filter(r => activePlatforms.has(r.key));

  const togglePlatform = (key: string) => {
    setActivePlatforms(prev => {
      const s = new Set(prev);
      if (s.has(key)) { if (s.size > 1) s.delete(key); } else s.add(key);
      return s;
    });
  };

  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
      {/* ─── Header ─────────────────────────────────────── */}
      <button onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-purple-500/5 transition-all">
        <div className="flex items-center gap-2">
          <svg className={`w-5 h-5 text-purple-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">الحملات الإعلانية</h2>
            <p className="text-xs text-purple-400/60">{connectedCount}/4 منصة متصلة</p>
          </div>
        </div>
      </button>

      {!isCollapsed && (
        <div className="px-4 pb-5 space-y-4">

          {/* ─── الإحصائيات الإجمالية ─────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'الصرف الإجمالي',    value: fmtNum(totalSpend),  sub: 'ر.س', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/20', text: 'text-orange-300' },
              { label: 'المبيعات الإجمالية', value: fmtNum(totalSales),  sub: 'ر.س', color: 'from-blue-500/20 to-blue-600/10',   border: 'border-blue-500/20',   text: 'text-blue-300' },
              { label: 'الطلبات الإجمالية',  value: fmtNum(totalOrders), sub: 'طلب', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/20',  text: 'text-green-300' },
              { label: 'العائد (ROAS)',       value: `${totalRoas.toFixed(2)}x`, sub: 'العائد على الإنفاق', color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/20', text: totalRoas < 1 ? 'text-red-400' : 'text-white' },
            ].map(k => (
              <div key={k.label} className={`bg-gradient-to-br ${k.color} rounded-xl p-4 border ${k.border}`}>
                <p className="text-xs text-purple-300/60 mb-1">{k.label}</p>
                <p className={`text-2xl font-bold ${k.text}`}>{k.value}</p>
                <p className="text-xs text-purple-400/50 mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* ─── تحذير اكتمال البيانات ───────────────────── */}
          {snapConnected && (snapWarning || snapTime?.finalized_end) && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-yellow-500/8 border border-yellow-500/20 text-sm">
              <span className="text-yellow-400 text-base shrink-0 mt-0.5">⚠️</span>
              <div className="text-right">
                <span className="text-yellow-300 font-semibold">البيانات مكتملة حتى: </span>
                <span className="text-yellow-200/80">
                  {snapTime?.finalized_end
                    ? new Date(snapTime.finalized_end).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh', dateStyle: 'medium', timeStyle: 'short' })
                    : snapWarning}
                </span>
                {snapTime?.finalized_end && (
                  <p className="text-yellow-400/60 text-xs mt-0.5">قد تكون ساعات اليوم الأخيرة غير مكتملة.</p>
                )}
              </div>
            </div>
          )}

          {/* ─── فلتر الأيام + فلتر المنصات ─────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* فلتر الأيام */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-purple-400/60">الفترة:</span>
              {DATE_PRESETS.map(p => (
                <button key={p.value} onClick={() => setDatePreset(p.value)}
                  className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                    datePreset === p.value
                      ? 'bg-yellow-500 border-yellow-500 text-black font-bold'
                      : 'bg-purple-900/30 border-purple-500/20 text-purple-300/70 hover:border-purple-400/40'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>

            {/* فلتر المنصات */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-purple-400/60">المنصات:</span>
              {ALL_PLATFORMS.map(key => {
                const cfg = PLATFORM_CONFIG[key];
                const row = rows.find(r => r.key === key);
                const active = activePlatforms.has(key);
                return (
                  <button key={key} onClick={() => togglePlatform(key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all ${
                      active
                        ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                        : 'bg-purple-900/20 border-purple-500/10 text-purple-400/40'
                    }`}>
                    <span className={active ? cfg.color : 'opacity-40'}>{cfg.icon}</span>
                    {cfg.name}
                    {row?.connected && <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── جدول المنصات ────────────────────────────── */}
          <div className="rounded-xl border border-purple-500/15 overflow-hidden">
            {/* رأس الجدول */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-0 bg-purple-900/30 px-4 py-2.5 text-xs text-purple-400/60 font-semibold border-b border-purple-500/15">
              <span className="text-right">المنصة</span>
              <span className="text-center">الصرف</span>
              <span className="text-center">المبيعات</span>
              <span className="text-center">الطلبات</span>
              <span className="text-center">العائد</span>
            </div>

            {/* حساب إجمالي الصفوف المرئية */}
            {filteredRows.map((row, i) => {
              const cfg = PLATFORM_CONFIG[row.key];
              const isLast = i === filteredRows.length - 1;
              return (
                <div key={row.key}>
                  <div
                    className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-0 px-4 py-3 items-center transition-colors hover:bg-purple-500/5 cursor-pointer ${!isLast ? 'border-b border-purple-500/10' : ''}`}
                    onClick={() => row.connected && setExpandedPlatform(expandedPlatform === row.key ? null : row.key)}
                  >
                    {/* المنصة */}
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0 ${cfg.color}`}>
                        {cfg.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{cfg.name}</p>
                        {row.connected ? (
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                            <p className="text-xs text-green-400/80 truncate max-w-[100px]">متصل</p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                            <p className="text-xs text-gray-500">غير متصل</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* الصرف */}
                    <div className="text-center">
                      {row.loading ? (
                        <div className="w-4 h-4 border border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
                      ) : row.connected ? (
                        <p className="text-sm font-normal text-orange-300">{fmtNum(row.spend)}</p>
                      ) : (
                        <p className="text-sm text-gray-600">—</p>
                      )}
                    </div>

                    {/* المبيعات */}
                    <div className="text-center">
                      {row.connected ? (
                        <p className="text-sm font-normal text-blue-300">{fmtNum(row.sales)}</p>
                      ) : <p className="text-sm text-gray-600">—</p>}
                    </div>

                    {/* الطلبات */}
                    <div className="text-center">
                      {row.connected ? (
                        <p className="text-sm font-normal text-green-300">{fmtNum(row.orders)}</p>
                      ) : <p className="text-sm text-gray-600">—</p>}
                    </div>

                    {/* العائد */}
                    <div className="text-center">
                      {row.connected ? (
                        <p className={`text-sm font-normal ${row.roas < 1 ? 'text-red-400' : 'text-purple-300'}`}>
                          {row.roas.toFixed(2)}x
                        </p>
                      ) : (
                        row.key === 'meta' && storeId ? (
                          <a href={`/api/meta/connect?storeId=${storeId}`}
                            onClick={e => e.stopPropagation()}
                            className="text-xs px-2 py-0.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 rounded-lg hover:bg-indigo-600/40 transition-all">
                            ربط
                          </a>
                        ) : row.key === 'snapchat' ? (
                          <button onClick={e => { e.stopPropagation(); onConnectClick?.(); }}
                            className="text-xs px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 rounded-lg hover:bg-yellow-500/40 transition-all">
                            ربط
                          </button>
                        ) : row.key === 'tiktok' && storeId ? (
                          <a href={`/api/tiktok/auth?store_id=${storeId}`}
                            onClick={e => e.stopPropagation()}
                            className="text-xs px-2 py-0.5 bg-white/10 border border-white/20 text-white/70 rounded-lg hover:bg-white/20 transition-all">
                            ربط
                          </a>
                        ) : row.key === 'google' && storeId ? (
                          <GoogleAdsInlineButton storeId={storeId} />
                        ) : (
                          <span className="text-xs text-gray-600">قريباً</span>
                        )
                      )}
                    </div>
                  </div>

                  {/* تفاصيل Meta عند التوسع */}
                  {row.key === 'meta' && expandedPlatform === 'meta' && storeId && (
                    <div className="border-t border-indigo-500/10 bg-indigo-500/5">
                      <MetaAdsCard storeId={storeId} embedded
                        onSummaryLoaded={(s) => {
                          if (s) setMetaData({ spend: s.spend, sales: s.revenue ?? 0, orders: s.conversions, roas: s.roas ?? 0 });
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {/* ─── صف الإجمالي ─── */}
            {(() => {
              const connectedRows = filteredRows.filter(r => r.connected);
              if (connectedRows.length === 0) return null;
              const sumSpend  = connectedRows.reduce((a, r) => a + r.spend,  0);
              const sumSales  = connectedRows.reduce((a, r) => a + r.sales,  0);
              const sumOrders = connectedRows.reduce((a, r) => a + r.orders, 0);
              const avgRoas   = sumSpend > 0 ? sumSales / sumSpend : 0;
              return (
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-0 px-4 py-3 items-center border-t-2 border-purple-500/30 bg-purple-900/20">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-white">الإجمالي</p>
                    <span className="text-xs text-purple-400/50">({connectedRows.length} منصة)</span>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-orange-300">{fmtNum(sumSpend)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-blue-300">{fmtNum(sumSales)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-green-300">{fmtNum(sumOrders)}</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-black ${avgRoas < 1 ? 'text-red-400' : 'text-purple-300'}`}>{avgRoas.toFixed(2)}x</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* MetaAdsCard مخفي لجلب البيانات تلقائياً مع مزامنة الفترة */}
          {storeId && (() => {
            const metaPreset = datePreset === '7d' ? 'last_7d' : datePreset === '30d' ? 'last_30d' : datePreset === '90d' ? 'last_90d' : datePreset;
            return (
              <div className="hidden">
                <MetaAdsCard storeId={storeId} embedded externalPreset={metaPreset}
                  onSummaryLoaded={(s) => {
                    if (s) setMetaData({ spend: s.spend, sales: s.revenue ?? 0, orders: s.conversions, roas: s.roas ?? 0 });
                    else setMetaData(null);
                  }}
                />
              </div>
            );
          })()}

        </div>
      )}

      {/* ─── Modal اختيار الحساب الإعلاني لـ Meta ─── */}
      {metaModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} onClick={() => setMetaModal(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div className="relative bg-[#130826] border border-indigo-500/40 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl shadow-indigo-500/20"
            style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 008.44-9.9c0-5.53-4.5-10.02-10-10.02z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">اختيار الحساب الإعلاني</h3>
                  {metaConn?.meta_user_name && (
                    <p className="text-xs text-green-400/80 flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                      {metaConn.meta_user_name}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setMetaModal(false)}
                className="w-8 h-8 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 flex items-center justify-center text-purple-400 transition-all shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            {metaAccLoading ? (
              <div className="flex items-center justify-center py-8 gap-3">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-purple-300/60">جاري تحميل الحسابات...</span>
              </div>
            ) : metaAccounts.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-purple-300/60 mb-4">اضغط لتحميل حساباتك الإعلانية</p>
                <button onClick={loadMetaAccounts}
                  className="px-5 py-2.5 bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-sm rounded-xl hover:bg-indigo-600/50 transition-all">
                  تحميل الحسابات
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 overflow-hidden">
                <p className="text-xs text-purple-400/60 shrink-0">اختر الحساب الإعلاني لهذا المتجر:</p>

                {/* حقل البحث */}
                <div className="relative shrink-0">
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="ابحث عن حساب..."
                    value={metaSearch}
                    onChange={e => setMetaSearch(e.target.value)}
                    className="w-full pr-9 pl-3 py-2.5 bg-purple-900/30 border border-purple-500/20 text-white text-sm rounded-xl outline-none focus:border-indigo-500/50 placeholder:text-purple-400/40 transition-all"
                  />
                </div>

                {/* قائمة الحسابات */}
                <div className="space-y-2 overflow-y-auto flex-1" style={{ maxHeight: '280px' }}>
                  {metaAccounts
                    .filter(acc => acc.name.toLowerCase().includes(metaSearch.toLowerCase()) || acc.id.includes(metaSearch))
                    .map(acc => (
                      <button key={acc.id} onClick={() => setMetaSelected(acc.id)}
                        className={`w-full text-right px-4 py-3 rounded-xl border transition-all ${
                          metaSelected === acc.id
                            ? 'bg-indigo-600/30 border-indigo-500/60 text-white'
                            : 'bg-purple-900/20 border-purple-500/10 text-purple-300/70 hover:border-indigo-500/30 hover:bg-indigo-500/10'
                        }`}>
                        <p className="text-sm font-semibold">{acc.name}</p>
                        <p className="text-xs text-purple-400/50 mt-0.5">{acc.id} · {acc.currency}</p>
                      </button>
                    ))}
                  {metaAccounts.filter(acc => acc.name.toLowerCase().includes(metaSearch.toLowerCase()) || acc.id.includes(metaSearch)).length === 0 && (
                    <p className="text-center text-sm text-purple-400/40 py-4">لا توجد نتائج</p>
                  )}
                </div>

                <button onClick={saveMetaAccount} disabled={!metaSelected || metaSaving}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-all shrink-0">
                  {metaSaving ? 'جاري الحفظ...' : 'تأكيد الاختيار'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
