'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface SnapchatCampaignsSectionProps {
  storeId: string | null;
  directIntegrations: Record<string, { status: string; ad_account_id?: string; ad_account_name?: string }>;
}

interface Campaign {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  swipes: number;
  orders: number;
  sales: number;
  cpa: number;
  roas: number;
}

interface CampaignsData {
  success: boolean;
  currency: string;
  time: {
    start: string;
    end: string;
    effective_end: string;
    finalized_end: string | null;
  };
  summary: {
    spend: number;
    orders: number;
    sales: number;
    roas: number;
  };
  campaigns: Campaign[];
  warning?: string;
  debug?: any;
  error?: string;
  needs_reauth?: boolean;
  needs_connection?: boolean;
}

export default function SnapchatCampaignsSection({ storeId, directIntegrations }: SnapchatCampaignsSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CampaignsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean;
    needsReauth: boolean;
    adAccountName: string | null;
    checking: boolean;
  }>({ isConnected: false, needsReauth: false, adAccountName: null, checking: true });

  // جلب حالة الربط من API مباشرة
  const checkConnection = async () => {
    if (!storeId) return;
    
    try {
      const response = await fetch(`/api/integrations/status?storeId=${storeId}`);
      const result = await response.json();
      
      if (result.success && result.integrations?.snapchat) {
        const snap = result.integrations.snapchat;
        setConnectionStatus({
          isConnected: snap.status === 'connected' && !!snap.ad_account_id,
          needsReauth: snap.status === 'needs_reauth',
          adAccountName: snap.ad_account_name || null,
          checking: false,
        });
      } else {
        setConnectionStatus({ isConnected: false, needsReauth: false, adAccountName: null, checking: false });
      }
    } catch (err) {
      console.error('Error checking connection:', err);
      setConnectionStatus({ isConnected: false, needsReauth: false, adAccountName: null, checking: false });
    }
  };

  // أيضاً استخدم props كـ fallback
  const snapchatIntegration = directIntegrations?.snapchat;
  const isConnectedFromProps = snapchatIntegration?.status === 'connected' && !!snapchatIntegration?.ad_account_id;
  const isConnected = connectionStatus.isConnected || isConnectedFromProps;
  const needsReauth = connectionStatus.needsReauth || snapchatIntegration?.status === 'needs_reauth';
  const adAccountName = connectionStatus.adAccountName || snapchatIntegration?.ad_account_name;

  const fetchCampaigns = async () => {
    if (!storeId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching campaigns for store:', storeId, 'range:', range);
      const response = await fetch(`/api/stores/${storeId}/snapchat/campaigns?range=${range}`);
      
      // التحقق من HTTP status أولاً
      if (!response.ok) {
        console.error('HTTP error:', response.status);
        if (response.status === 404) {
          setError('Route not found (404). Check API path.');
        } else if (response.status === 401 || response.status === 403) {
          setConnectionStatus(prev => ({ ...prev, needsReauth: true, isConnected: false }));
          setError('انتهت صلاحية الربط. يرجى إعادة ربط Snapchat.');
        } else {
          setError(`HTTP Error: ${response.status}`);
        }
        setLoading(false);
        return;
      }
      
      const result = await response.json();
      console.log('Snapchat campaigns API response:', result);
      
      // إذا success=true أو campaigns موجودة، الربط يعمل
      if (result.success || (result.campaigns && result.campaigns.length >= 0)) {
        setData(result);
        setConnectionStatus(prev => ({ ...prev, isConnected: true, checking: false }));
        setError(null);
      } else {
        // فقط إذا success=false صريحاً
        if (result.needs_reauth) {
          setConnectionStatus(prev => ({ ...prev, needsReauth: true, isConnected: false }));
          setError('انتهت صلاحية الربط. يرجى إعادة ربط Snapchat.');
        } else if (result.needs_connection) {
          setConnectionStatus(prev => ({ ...prev, isConnected: false, checking: false }));
        } else {
          setError(result.error || 'Failed to fetch campaigns');
        }
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      checkConnection();
      // جلب البيانات مباشرة بدون انتظار
      fetchCampaigns();
    }
  }, [storeId]);

  useEffect(() => {
    if (storeId && !isCollapsed) {
      fetchCampaigns();
    }
  }, [range, isCollapsed]);

  return (
    <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full p-4 flex items-center justify-between hover:bg-purple-500/5 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">📊 حملات Snapchat</h2>
        </div>
        <svg className={`w-5 h-5 text-purple-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4 pt-0 space-y-4">
          {/* Snapchat Section */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 text-yellow-400" viewBox="0 0 512 512" fill="currentColor">
                  <path d="M496.926,366.6c-3.373-9.176-9.8-14.086-17.112-18.153-1.376-.806-2.641-1.451-3.72-1.947-2.182-1.128-4.414-2.22-6.634-3.373-22.8-12.09-40.609-27.341-52.959-45.42a102.889,102.889,0,0,1-9.089-16.269c-1.054-2.766-.992-4.377-.065-5.954a11.249,11.249,0,0,1,3.088-2.818c2.766-1.8,5.669-3.373,8.2-4.7,4.7-2.5,8.5-4.5,10.9-5.954,7.287-4.477,12.5-9.4,15.5-14.629a24.166,24.166,0,0,0,1.863-22.031c-4.328-12.266-17.9-19.263-28.263-19.263a35.007,35.007,0,0,0-9.834,1.376c-.124.037-.236.074-.347.111,0-1.451.024-2.915.024-4.377,0-22.92-2.508-46.152-10.9-67.615C378.538,91.727,341.063,56.7,286.741,50.6a118.907,118.907,0,0,0-12.293-.621h-36.9a118.907,118.907,0,0,0-12.293.621c-54.31,6.1-91.785,41.127-110.839,84.168-8.4,21.463-10.9,44.7-10.9,67.615,0,1.462.012,2.926.024,4.377-.111-.037-.223-.074-.347-.111a35.007,35.007,0,0,0-9.834-1.376c-10.362,0-23.935,7-28.263,19.263a24.166,24.166,0,0,0,1.863,22.031c3,5.233,8.213,10.152,15.5,14.629,2.4,1.451,6.2,3.46,10.9,5.954,2.52,1.327,5.418,2.9,8.181,4.7a11.3,11.3,0,0,1,3.088,2.818c.927,1.576.989,3.187-.065,5.954a102.889,102.889,0,0,1-9.089,16.269c-12.35,18.079-30.161,33.33-52.959,45.42-2.22,1.153-4.452,2.245-6.634,3.373-1.079.5-2.344,1.141-3.72,1.947-7.312,4.067-13.739,8.977-17.112,18.153-3.6,9.834-1.044,20.882,7.6,32.838a71.2,71.2,0,0,0,33.787,19.016c4.278.2,8.7-.161,13.168-.533,3.9-.322,7.9-.657,11.778-.657a53.666,53.666,0,0,1,9.725.806c.682,1.054,1.376,2.182,2.108,3.4,4.7,7.823,11.168,18.54,24.077,29.2,13.8,11.4,32.018,21.041,57.271,28.489a12.478,12.478,0,0,1,3.633,1.54c3.088,4.278,8.083,7.947,15.259,11.242,8.362,3.844,18.8,6.746,31.1,8.635a245.762,245.762,0,0,0,37.238,2.817c12.8,0,25.371-.918,37.238-2.817,12.3-1.889,22.738-4.791,31.1-8.635,7.176-3.3,12.171-6.964,15.259-11.242a12.478,12.478,0,0,1,3.633-1.54c25.253-7.448,43.469-17.087,57.271-28.489,12.909-10.659,19.375-21.376,24.077-29.2.732-1.215,1.426-2.344,2.108-3.4a53.666,53.666,0,0,1,9.725-.806c3.881,0,7.874.335,11.778.657,4.464.372,8.89.732,13.168.533a71.2,71.2,0,0,0,33.787-19.016C497.97,387.482,500.526,376.434,496.926,366.6Z"/>
                </svg>
                <div>
                  <h3 className="text-lg font-bold text-white">Snapchat Ads</h3>
                  <p className="text-xs text-yellow-400/70">
                    {connectionStatus.checking ? 'جاري التحقق...' : isConnected ? (adAccountName || 'Connected') : needsReauth ? 'يحتاج إعادة ربط' : 'غير مرتبط'}
                  </p>
                </div>
              </div>
              
              {/* Connection Status */}
              {connectionStatus.checking ? (
                <div className="w-5 h-5 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
              ) : isConnected ? (
                <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400">مرتبط ✓</span>
              ) : needsReauth ? (
                <Link
                  href={`/api/integrations/snapchat/start?storeId=${storeId}`}
                  className="px-4 py-2 rounded-lg text-sm bg-orange-500/30 text-orange-300 hover:bg-orange-500/50 transition-colors"
                >
                  إعادة الربط
                </Link>
              ) : (
                <Link
                  href={`/api/integrations/snapchat/start?storeId=${storeId}`}
                  className="px-4 py-2 rounded-lg text-sm bg-yellow-500/30 text-yellow-300 hover:bg-yellow-500/50 transition-colors"
                >
                  ربط Snapchat
                </Link>
              )}
            </div>

            {/* عرض المحتوى دائماً - البيانات ستحدد الحالة */}
            {(isConnected || connectionStatus.checking || data) && (
              <>
                {/* Range Selector */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-yellow-300">الفترة:</span>
                  {[
                    { value: '7d', label: '7 أيام' },
                    { value: '30d', label: '30 يوم' },
                    { value: '90d', label: '90 يوم' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setRange(option.value as '7d' | '30d' | '90d')}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                        range === option.value
                          ? 'bg-yellow-500 text-black font-bold'
                          : 'bg-yellow-900/30 text-yellow-300 hover:bg-yellow-800/50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    onClick={fetchCampaigns}
                    disabled={loading}
                    className="ml-auto px-3 py-1.5 text-xs rounded-lg bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                  >
                    {loading ? '⏳' : '🔄'} تحديث
                  </button>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin"></div>
                  </div>
                )}

                {/* Error State */}
                {error && !loading && (
                  <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-center">
                    <p className="text-red-300 text-sm">{error}</p>
                    {data?.needs_reauth && (
                      <Link
                        href={`/api/integrations/snapchat/start?storeId=${storeId}`}
                        className="mt-2 inline-block px-4 py-2 rounded-lg text-sm bg-orange-500/30 text-orange-300 hover:bg-orange-500/50 transition-colors"
                      >
                        إعادة ربط Snapchat
                      </Link>
                    )}
                  </div>
                )}

                {/* Data Display */}
                {data && !loading && !error && (
                  <>
                    {/* Warning */}
                    {data.warning && (
                      <div className="p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg mb-4">
                        <p className="text-orange-300 text-xs">⚠️ {data.warning}</p>
                      </div>
                    )}

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl p-4 border border-orange-500/20">
                        <p className="text-xs text-orange-400 mb-1">الصرف</p>
                        <p className="text-2xl font-bold text-white">{data.summary.spend.toLocaleString('ar-SA', { maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-orange-400/70">ر.س</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-4 border border-green-500/20">
                        <p className="text-xs text-green-400 mb-1">الطلبات</p>
                        <p className="text-2xl font-bold text-white">{data.summary.orders.toLocaleString()}</p>
                        <p className="text-xs text-green-400/70">طلب</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/20">
                        <p className="text-xs text-blue-400 mb-1">المبيعات</p>
                        <p className="text-2xl font-bold text-white">{data.summary.sales.toLocaleString('ar-SA', { maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-blue-400/70">ر.س</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/20">
                        <p className="text-xs text-purple-400 mb-1">ROAS</p>
                        <p className={`text-2xl font-bold ${data.summary.roas < 1 ? 'text-red-400' : 'text-white'}`}>
                          {data.summary.roas.toFixed(2)}x
                        </p>
                        <p className="text-xs text-purple-400/70">العائد</p>
                      </div>
                    </div>

                    {/* Campaigns Table */}
                    {data.campaigns.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-yellow-400 text-xs border-b border-yellow-500/20">
                              <th className="text-right pb-2 pr-2">الحملة</th>
                              <th className="text-center pb-2">الصرف</th>
                              <th className="text-center pb-2">الظهور</th>
                              <th className="text-center pb-2">الضغطات</th>
                              <th className="text-center pb-2">الطلبات</th>
                              <th className="text-center pb-2">المبيعات</th>
                              <th className="text-center pb-2">CPA</th>
                              <th className="text-center pb-2">ROAS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.campaigns.map((campaign, idx) => (
                              <tr key={campaign.campaign_id} className="border-t border-yellow-500/10 text-white hover:bg-yellow-900/20">
                                <td className="py-2 pr-2 text-right truncate max-w-[200px]" title={campaign.campaign_name}>
                                  {campaign.campaign_name}
                                </td>
                                <td className="py-2 text-center text-orange-400">{campaign.spend.toLocaleString('ar-SA', { maximumFractionDigits: 0 })}</td>
                                <td className="py-2 text-center">{campaign.impressions.toLocaleString()}</td>
                                <td className="py-2 text-center">{campaign.swipes.toLocaleString()}</td>
                                <td className="py-2 text-center text-green-400">{campaign.orders.toLocaleString()}</td>
                                <td className="py-2 text-center text-blue-400">{campaign.sales.toLocaleString('ar-SA', { maximumFractionDigits: 0 })}</td>
                                <td className="py-2 text-center">{campaign.cpa.toFixed(0)}</td>
                                <td className={`py-2 text-center ${campaign.roas < 1 ? 'text-red-400' : 'text-purple-400'}`}>
                                  {campaign.roas.toFixed(2)}x
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-yellow-400/70">
                        <p>لا توجد بيانات في هذه الفترة</p>
                        <p className="text-xs mt-1">جرّب 30 أو 90 يوم</p>
                      </div>
                    )}

                    {/* Debug Toggle */}
                    <div className="mt-4 pt-4 border-t border-yellow-500/20">
                      <button
                        onClick={() => setShowDebug(!showDebug)}
                        className="text-xs text-yellow-400/50 hover:text-yellow-400 transition-colors"
                      >
                        {showDebug ? '🔽 إخفاء التشخيص' : '🔧 عرض معلومات التشخيص'}
                      </button>
                      {showDebug && data.debug && (
                        <div className="mt-2 p-3 bg-black/30 rounded-lg text-xs font-mono text-yellow-300/70 overflow-x-auto">
                          <p>start_time: {data.time.start}</p>
                          <p>end_time: {data.time.end}</p>
                          <p>effective_end: {data.time.effective_end}</p>
                          <p>finalized_end: {data.time.finalized_end || 'N/A'}</p>
                          <p>campaigns_count: {data.campaigns.length}</p>
                          <p>fields_used: {data.debug?.fields_used}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Coming Soon Platforms */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { name: 'TikTok', color: 'gray', icon: '🎵' },
              { name: 'Meta', color: 'blue', icon: '📘' },
              { name: 'Google Ads', color: 'green', icon: '🔍' },
            ].map(platform => (
              <div key={platform.name} className={`bg-${platform.color}-500/10 border border-${platform.color}-500/30 rounded-xl p-4 text-center opacity-60`}>
                <span className="text-3xl">{platform.icon}</span>
                <h4 className="text-white font-medium mt-2">{platform.name}</h4>
                <p className="text-xs text-gray-400 mt-1">قريبًا</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
