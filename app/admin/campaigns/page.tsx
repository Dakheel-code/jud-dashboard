'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Store {
  id: string;
  store_name: string;
  store_url: string;
}

interface SnapchatStatus {
  connected: boolean;
  needs_reauth: boolean;
  ad_account_selected: boolean;
  ad_account_name: string | null;
  ad_account_id: string | null;
}

interface Campaign {
  campaign_id: string;
  campaign_name: string;
  status: string;
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
  summary: {
    spend: number;
    impressions: number;
    swipes: number;
    orders: number;
    sales: number;
    roas: number;
    cpa: number;
  };
  campaigns: Campaign[];
}

function CampaignsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlStoreId = searchParams.get('storeId');

  // States
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [storeSearch, setStoreSearch] = useState('');
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);

  const [snapchatStatus, setSnapchatStatus] = useState<SnapchatStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const [campaignsData, setCampaignsData] = useState<CampaignsData | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);

  const [range, setRange] = useState<'today' | 'yesterday' | '7d' | '30d' | '90d'>('7d');
  const [campaignSearch, setCampaignSearch] = useState('');
  const [visibleCampaigns, setVisibleCampaigns] = useState(5);
  
  // التحكم في الحملات
  const [updatingCampaign, setUpdatingCampaign] = useState<string | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load stores
  useEffect(() => {
    fetchStores();
  }, []);

  // Load from localStorage or URL
  useEffect(() => {
    if (urlStoreId) {
      setSelectedStoreId(urlStoreId);
      localStorage.setItem('lastSelectedStoreId', urlStoreId);
    } else {
      const lastStore = localStorage.getItem('lastSelectedStoreId');
      if (lastStore) {
        setSelectedStoreId(lastStore);
      }
    }
  }, [urlStoreId]);

  // Fetch status and campaigns when store changes
  useEffect(() => {
    if (selectedStoreId) {
      fetchSnapchatStatus();
      fetchCampaigns();
    }
  }, [selectedStoreId, range]);

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/admin/stores');
      const result = await response.json();
      if (result.stores) {
        setStores(result.stores);
      }
    } catch (err) {
      console.error('Error fetching stores:', err);
    } finally {
      setLoadingStores(false);
    }
  };

  const fetchSnapchatStatus = async () => {
    if (!selectedStoreId) return;
    setLoadingStatus(true);
    try {
      const response = await fetch(`/api/stores/${selectedStoreId}/snapchat/status`);
      const result = await response.json();
      setSnapchatStatus(result);
    } catch (err) {
      console.error('Error fetching status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchCampaigns = async () => {
    if (!selectedStoreId) return;
    setLoadingCampaigns(true);
    setCampaignsError(null);
    try {
      const response = await fetch(`/api/stores/${selectedStoreId}/snapchat/campaigns?range=${range}`);
      const result = await response.json();
      if (result.success) {
        setCampaignsData(result);
      } else {
        setCampaignsError(result.error || 'Failed to fetch campaigns');
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setCampaignsError('Network error');
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleStoreSelect = (store: Store) => {
    setSelectedStoreId(store.id);
    localStorage.setItem('lastSelectedStoreId', store.id);
    setShowStoreDropdown(false);
    setStoreSearch('');
    router.push(`/admin/campaigns?storeId=${store.id}`);
  };

  // إيقاف/استئناف الحملة
  const toggleCampaignStatus = async (campaignId: string, currentStatus: string) => {
    if (!selectedStoreId) return;
    
    setUpdatingCampaign(campaignId);
    setActionMessage(null);
    
    try {
      const action = currentStatus === 'ACTIVE' ? 'pause' : 'resume';
      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: selectedStoreId, action })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setActionMessage({ type: 'success', text: result.message });
        // تحديث الحملات
        fetchCampaigns();
      } else {
        setActionMessage({ type: 'error', text: result.error || 'فشل في تحديث الحملة' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'خطأ في الاتصال' });
    } finally {
      setUpdatingCampaign(null);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  // تحديث ميزانية الحملة
  const updateCampaignBudget = async () => {
    if (!selectedStoreId || !showBudgetModal || !budgetValue) return;
    
    setUpdatingCampaign(showBudgetModal);
    setActionMessage(null);
    
    try {
      // تحويل الميزانية إلى micro (× 1,000,000)
      const budgetMicro = parseFloat(budgetValue) * 1000000;
      
      const response = await fetch(`/api/admin/campaigns/${showBudgetModal}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: selectedStoreId, daily_budget_micro: budgetMicro })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setActionMessage({ type: 'success', text: 'تم تحديث الميزانية بنجاح' });
        setShowBudgetModal(null);
        setBudgetValue('');
        fetchCampaigns();
      } else {
        setActionMessage({ type: 'error', text: result.error || 'فشل في تحديث الميزانية' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'خطأ في الاتصال' });
    } finally {
      setUpdatingCampaign(null);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const selectedStore = stores.find(s => s.id === selectedStoreId);
  const filteredStores = stores.filter(s => 
    s.store_name.toLowerCase().includes(storeSearch.toLowerCase()) ||
    s.store_url.toLowerCase().includes(storeSearch.toLowerCase())
  );

  const filteredCampaigns = campaignsData?.campaigns.filter(c =>
    c.campaign_name.toLowerCase().includes(campaignSearch.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen bg-[#0a0118] pb-20 lg:pb-8 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-purple-600/20 rounded-full blur-3xl -top-48 -right-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-violet-600/20 rounded-full blur-3xl top-1/3 -left-48 animate-pulse"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src="/logo.png" alt="Logo" className="w-14 h-14 sm:w-20 sm:h-20 object-contain" />
            <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
            <div>
              <h1 className="text-xl sm:text-3xl text-white mb-1 uppercase" style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}>
                الحملات الإعلانية
              </h1>
              <p className="text-purple-300/80 text-xs sm:text-sm">إدارة ومتابعة حملات سناب شات الإعلانية</p>
            </div>
          </div>
        </div>

        {/* Store Selector */}
        <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-4 mb-6 relative z-[9999]">
          <div className="relative">
            <label className="block text-sm text-purple-300 mb-2">اختر المتجر</label>
            <button
              onClick={() => setShowStoreDropdown(!showStoreDropdown)}
              className="w-full md:w-96 px-4 py-3 rounded-xl bg-purple-900/30 border border-purple-500/30 text-white text-right flex items-center justify-between hover:bg-purple-900/50 transition-colors"
            >
              {loadingStores ? (
                <span className="text-purple-400">جاري التحميل...</span>
              ) : selectedStore ? (
                <div>
                  <span className="font-medium">{selectedStore.store_name}</span>
                  <span className="text-purple-400 text-sm mr-2">({selectedStore.store_url})</span>
                </div>
              ) : (
                <span className="text-purple-400">اختر متجر...</span>
              )}
              <svg className={`w-5 h-5 text-purple-400 transition-transform ${showStoreDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showStoreDropdown && (
              <div className="absolute z-[9999] mt-2 w-full md:w-96 bg-[#1a0a2e] border border-purple-500/30 rounded-xl shadow-2xl max-h-80 overflow-hidden">
                <div className="p-2 border-b border-purple-500/20">
                  <input
                    type="text"
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    placeholder="بحث..."
                    className="w-full px-3 py-2 rounded-lg bg-purple-900/30 border border-purple-500/20 text-white placeholder-purple-400 text-sm"
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredStores.length === 0 ? (
                    <div className="p-4 text-center text-purple-400 text-sm">لا توجد نتائج</div>
                  ) : (
                    filteredStores.map(store => (
                      <button
                        key={store.id}
                        onClick={() => handleStoreSelect(store)}
                        className={`w-full px-4 py-3 text-right hover:bg-purple-800/50 transition-colors ${
                          store.id === selectedStoreId ? 'bg-purple-800/30' : ''
                        }`}
                      >
                        <div className="font-medium text-white">{store.store_name}</div>
                        <div className="text-sm text-purple-400">{store.store_url}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        
        {/* Store Content */}
        {selectedStoreId && (
          <div className="space-y-6">
            {/* Snapchat Status Card */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <svg className="w-7 h-7 text-yellow-400" viewBox="0 0 512 512" fill="currentColor">
                      <path d="M496.926,366.6c-3.373-9.176-9.8-14.086-17.112-18.153..."/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Snapchat Ads</h3>
                    {loadingStatus ? (
                      <p className="text-yellow-400 text-sm">جاري التحقق...</p>
                    ) : snapchatStatus?.connected ? (
                      <p className="text-green-400 text-sm">✓ مرتبط: {snapchatStatus.ad_account_name}</p>
                    ) : snapchatStatus?.needs_reauth ? (
                      <p className="text-orange-400 text-sm">⚠️ يحتاج إعادة ربط</p>
                    ) : (
                      <p className="text-gray-400 text-sm">غير مرتبط</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {snapchatStatus?.connected ? (
                    <>
                      <button
                        onClick={() => router.push(`/admin/integrations/snapchat/select?storeId=${selectedStoreId}`)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                      >
                        تغيير الحساب
                      </button>
                      <button
                        onClick={() => window.location.href = `/api/integrations/snapchat/start?storeId=${selectedStoreId}&force=true`}
                        className="px-3 py-1.5 text-xs rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
                      >
                        إعادة الربط
                      </button>
                    </>
                  ) : snapchatStatus?.needs_reauth ? (
                    <button
                      onClick={() => window.location.href = `/api/integrations/snapchat/start?storeId=${selectedStoreId}&force=true`}
                      className="px-4 py-2 rounded-lg bg-orange-500 text-white font-bold hover:bg-orange-400 transition-colors"
                    >
                      🔄 إعادة الربط
                    </button>
                  ) : (
                    <button
                      onClick={() => window.location.href = `/api/integrations/snapchat/start?storeId=${selectedStoreId}`}
                      className="px-4 py-2 rounded-lg bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition-colors"
                    >
                      🔗 ربط Snapchat
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Filters */}
            {snapchatStatus?.connected && (
              <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Range */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-purple-300">الفترة:</span>
                    {[
                      { value: 'today', label: 'اليوم' },
                      { value: 'yesterday', label: 'أمس' },
                      { value: '7d', label: '7 أيام' },
                      { value: '30d', label: '30 يوم' },
                      { value: '90d', label: '90 يوم' },
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => { setRange(option.value as 'today' | 'yesterday' | '7d' | '30d' | '90d'); }}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          range === option.value
                            ? 'bg-purple-500 text-white font-bold'
                            : 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={campaignSearch}
                      onChange={(e) => setCampaignSearch(e.target.value)}
                      placeholder="بحث في الحملات..."
                      className="w-full px-3 py-2 rounded-lg bg-purple-900/30 border border-purple-500/20 text-white placeholder-purple-400 text-sm"
                    />
                  </div>

                  {/* Refresh */}
                  <button
                    onClick={fetchCampaigns}
                    disabled={loadingCampaigns}
                    className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                  >
                    {loadingCampaigns ? '⏳' : '🔄'} تحديث
                  </button>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            {snapchatStatus?.connected && campaignsData?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl p-4 border border-orange-500/20">
                  <p className="text-xs text-orange-400 mb-1">الصرف</p>
                  <p className="text-xl font-bold text-white">{(campaignsData.summary.spend || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-orange-400/70">ر.س</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/20">
                  <p className="text-xs text-blue-400 mb-1">الظهور</p>
                  <p className="text-xl font-bold text-white">{(campaignsData.summary.impressions || 0).toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 rounded-xl p-4 border border-cyan-500/20">
                  <p className="text-xs text-cyan-400 mb-1">الضغطات</p>
                  <p className="text-xl font-bold text-white">{(campaignsData.summary.swipes || 0).toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-4 border border-green-500/20">
                  <p className="text-xs text-green-400 mb-1">الطلبات</p>
                  <p className="text-xl font-bold text-white">{(campaignsData.summary.orders || 0).toLocaleString()}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl p-4 border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 mb-1">المبيعات</p>
                  <p className="text-xl font-bold text-white">{(campaignsData.summary.sales || 0).toLocaleString('ar-SA', { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-emerald-400/70">ر.س</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/20">
                  <p className="text-xs text-purple-400 mb-1">ROAS</p>
                  <p className={`text-xl font-bold ${(campaignsData.summary.roas || 0) < 1 ? 'text-red-400' : 'text-white'}`}>
                    {(campaignsData.summary.roas || 0).toFixed(2)}x
                  </p>
                </div>
                <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/10 rounded-xl p-4 border border-pink-500/20">
                  <p className="text-xs text-pink-400 mb-1">CPA</p>
                  <p className="text-xl font-bold text-white">{(campaignsData.summary.cpa || 0).toFixed(0)}</p>
                  <p className="text-xs text-pink-400/70">ر.س</p>
                </div>
              </div>
            )}

            {/* Campaigns Table */}
            {snapchatStatus?.connected && (
              <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
                <div className="p-4 border-b border-purple-500/20">
                  <h3 className="text-lg font-bold text-white">الحملات ({filteredCampaigns.length})</h3>
                </div>

                {loadingCampaigns ? (
                  <div className="p-8 text-center">
                    <div className="w-10 h-10 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-purple-400">جاري تحميل الحملات...</p>
                  </div>
                ) : campaignsError ? (
                  <div className="p-8 text-center">
                    <span className="text-3xl mb-4 block">⚠️</span>
                    <p className="text-red-400">{campaignsError}</p>
                  </div>
                ) : filteredCampaigns.length === 0 ? (
                  <div className="p-8 text-center">
                    <span className="text-3xl mb-4 block">📭</span>
                    <p className="text-purple-400">لا توجد حملات في هذه الفترة</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-purple-400 text-xs border-b border-purple-500/20 bg-purple-900/20">
                            <th className="text-right py-3 px-4">الحملة</th>
                            <th className="text-center py-3 px-2">الحالة</th>
                            <th className="text-center py-3 px-2">الصرف</th>
                            <th className="text-center py-3 px-2">الظهور</th>
                            <th className="text-center py-3 px-2">الضغطات</th>
                            <th className="text-center py-3 px-2">الطلبات</th>
                            <th className="text-center py-3 px-2">المبيعات</th>
                            <th className="text-center py-3 px-2">ROAS</th>
                            <th className="text-center py-3 px-2">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCampaigns.slice(0, visibleCampaigns).map((campaign) => (
                            <tr key={campaign.campaign_id} className="border-t border-purple-500/10 text-white hover:bg-purple-900/20">
                              <td className="py-3 px-4 text-right">
                                <div className="truncate max-w-[200px]" title={campaign.campaign_name}>
                                  {campaign.campaign_name}
                                </div>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  campaign.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                                  campaign.status === 'PAUSED' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {campaign.status === 'ACTIVE' ? 'نشط' : campaign.status === 'PAUSED' ? 'متوقف' : campaign.status}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-center text-orange-400">
                                {campaign.spend > 0 ? campaign.spend.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '-'}
                              </td>
                              <td className="py-3 px-2 text-center">
                                {campaign.impressions > 0 ? campaign.impressions.toLocaleString('en-US') : '-'}
                              </td>
                              <td className="py-3 px-2 text-center">
                                {campaign.swipes > 0 ? campaign.swipes.toLocaleString('en-US') : '-'}
                              </td>
                              <td className="py-3 px-2 text-center text-green-400">
                                {campaign.orders > 0 ? campaign.orders.toLocaleString('en-US') : '-'}
                              </td>
                              <td className="py-3 px-2 text-center text-emerald-400">
                                {campaign.sales > 0 ? campaign.sales.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '-'}
                              </td>
                              <td className={`py-3 px-2 text-center ${campaign.roas < 1 ? 'text-red-400' : 'text-purple-400'}`}>
                                {campaign.roas > 0 ? `${campaign.roas.toFixed(2)}x` : '-'}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {/* زر إيقاف/استئناف */}
                                  <button
                                    onClick={() => toggleCampaignStatus(campaign.campaign_id, campaign.status)}
                                    disabled={updatingCampaign === campaign.campaign_id}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      campaign.status === 'ACTIVE' 
                                        ? 'text-yellow-400 hover:bg-yellow-500/20' 
                                        : 'text-green-400 hover:bg-green-500/20'
                                    } disabled:opacity-50`}
                                    title={campaign.status === 'ACTIVE' ? 'إيقاف الحملة' : 'استئناف الحملة'}
                                  >
                                    {updatingCampaign === campaign.campaign_id ? (
                                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                    ) : campaign.status === 'ACTIVE' ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    )}
                                  </button>
                                  {/* زر تعديل الميزانية */}
                                  <button
                                    onClick={() => setShowBudgetModal(campaign.campaign_id)}
                                    className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/20 transition-colors"
                                    title="تعديل الميزانية"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* زر المزيد */}
                    {filteredCampaigns.length > visibleCampaigns && (
                      <div className="p-4 text-center border-t border-purple-500/20">
                        <button
                          onClick={() => setVisibleCampaigns(prev => prev + 5)}
                          className="px-6 py-2 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors text-sm"
                        >
                          عرض المزيد ({filteredCampaigns.length - visibleCampaigns} حملة متبقية)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Coming Soon Platforms */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'TikTok Ads', icon: '🎵', color: 'pink' },
                { name: 'Meta Ads', icon: '📘', color: 'blue' },
                { name: 'Google Ads', icon: '🔍', color: 'green' },
              ].map(platform => (
                <div key={platform.name} className="bg-gray-500/10 border border-gray-500/30 rounded-2xl p-6 text-center opacity-60">
                  <span className="text-4xl">{platform.icon}</span>
                  <h4 className="text-white font-medium mt-3">{platform.name}</h4>
                  <p className="text-xs text-gray-400 mt-1">قريبًا</p>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* رسالة الإشعار */}
      {actionMessage && (
        <div className={`fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 p-4 rounded-xl shadow-lg z-50 ${
          actionMessage.type === 'success' ? 'bg-green-500/90' : 'bg-red-500/90'
        } text-white`}>
          <div className="flex items-center gap-3">
            {actionMessage.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{actionMessage.text}</span>
          </div>
        </div>
      )}

      {/* نافذة تعديل الميزانية */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">تعديل الميزانية اليومية</h3>
              <button
                onClick={() => { setShowBudgetModal(null); setBudgetValue(''); }}
                className="text-purple-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-purple-300 mb-2">الميزانية اليومية (ر.س)</label>
                <input
                  type="number"
                  value={budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value)}
                  placeholder="أدخل الميزانية اليومية"
                  className="w-full px-4 py-3 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none"
                  min="0"
                  step="1"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={updateCampaignBudget}
                  disabled={!budgetValue || updatingCampaign === showBudgetModal}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-fuchsia-500 transition-all disabled:opacity-50"
                >
                  {updatingCampaign === showBudgetModal ? 'جاري التحديث...' : 'حفظ'}
                </button>
                <button
                  onClick={() => { setShowBudgetModal(null); setBudgetValue(''); }}
                  className="px-6 py-3 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-500/10 transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="p-6 flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-purple-400">جاري التحميل...</p>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CampaignsContent />
    </Suspense>
  );
}
