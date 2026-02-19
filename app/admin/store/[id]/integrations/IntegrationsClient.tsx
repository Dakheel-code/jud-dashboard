'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type PlatformStatus = 'disconnected' | 'connected' | 'needs_reauth' | 'error';

interface PlatformInfo {
  status: PlatformStatus;
  ad_account_id?: string;
  ad_account_name?: string;
  organization_id?: string;
  last_connected_at?: string;
  error_message?: string;
}

interface AdAccount {
  ad_account_id: string;
  ad_account_name: string;
  organization_id?: string;
  currency?: string;
  status?: string;
}

export default function IntegrationsClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const storeId = params.id as string;
  const platformParam = searchParams.get('platform');
  const stepParam = searchParams.get('step');

  const [platforms, setPlatforms] = useState<Record<string, PlatformInfo>>({
    snapchat: { status: 'disconnected' },
    tiktok: { status: 'disconnected' },
    meta: { status: 'disconnected' },
    google: { status: 'disconnected' },
  });
  const [loading, setLoading] = useState(true);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [currentPlatform, setCurrentPlatform] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/integrations/status?storeId=${storeId}`);
      const data = await response.json();
      if (data.success) setPlatforms(data.platforms);
    } catch (error) { console.error('Failed to fetch status:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, [storeId]);

  useEffect(() => {
    if (platformParam && stepParam === 'select-account') openSelectAccountModal(platformParam);
  }, [platformParam, stepParam]);

  const handleConnect = (platform: string) => {
    if (platform === 'snapchat') { window.location.href = `/admin/store/${storeId}?connect=snapchat`; return; }
    window.location.href = `/api/integrations/${platform}/start?storeId=${storeId}`;
  };

  const openSelectAccountModal = async (platform: string) => {
    setCurrentPlatform(platform);
    setShowSelectModal(true);
    setLoadingAccounts(true);
    setAdAccounts([]);
    setSelectedAccount('');
    try {
      const response = await fetch(`/api/integrations/${platform}/ad-accounts?storeId=${storeId}`);
      const data = await response.json();
      if (data.success) {
        setAdAccounts(data.accounts);
        if (data.accounts.length === 1) setSelectedAccount(data.accounts[0].ad_account_id);
      } else if (data.needsReauth) { alert('انتهت صلاحية الربط. يرجى إعادة الربط.'); setShowSelectModal(false); }
    } catch (error) { console.error('Failed to fetch ad accounts:', error); }
    finally { setLoadingAccounts(false); }
  };

  const handleSaveAccount = async () => {
    if (!selectedAccount || !currentPlatform) return;
    const account = adAccounts.find((a) => a.ad_account_id === selectedAccount);
    if (!account) return;
    setSavingAccount(true);
    try {
      const response = await fetch(`/api/integrations/${currentPlatform}/select-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, ad_account_id: account.ad_account_id, ad_account_name: account.ad_account_name, organization_id: account.organization_id }),
      });
      const data = await response.json();
      if (data.success) { setShowSelectModal(false); fetchStatus(); window.location.href = `/admin/store/${storeId}`; }
      else alert('فشل في حفظ الحساب: ' + (data.error || 'خطأ غير معروف'));
    } catch (error) { console.error('Failed to save account:', error); alert('حدث خطأ'); }
    finally { setSavingAccount(false); }
  };

  const handleDisconnect = async (platform: string) => {
    if (!confirm('هل أنت متأكد من فصل الربط؟')) return;
    try {
      const response = await fetch(`/api/integrations/${platform}/disconnect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storeId }) });
      const data = await response.json();
      if (data.success) fetchStatus(); else alert('فشل في فصل الربط');
    } catch (error) { console.error('Failed to disconnect:', error); alert('حدث خطأ'); }
  };

  const getStatusBadge = (status: PlatformStatus) => {
    switch (status) {
      case 'connected':    return <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">متصل</span>;
      case 'needs_reauth': return <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded-full">يحتاج إعادة ربط</span>;
      case 'error':        return <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full">خطأ</span>;
      default:             return <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded-full">غير متصل</span>;
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0a0118] flex items-center justify-center"><div className="w-10 h-10 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>;
  }

  const platformsConfig = [
    { key: 'snapchat', name: 'Snapchat Ads', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30', textColor: 'text-yellow-400', disabled: false },
    { key: 'tiktok',   name: 'TikTok for Business', bgColor: 'bg-gray-800/50', borderColor: 'border-gray-600/30', textColor: 'text-white', disabled: true },
    { key: 'meta',     name: 'Meta (Facebook/Instagram)', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', textColor: 'text-blue-400', disabled: true },
    { key: 'google',   name: 'Google Ads', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', textColor: 'text-green-400', disabled: true },
  ];

  return (
    <div className="min-h-screen bg-[#0a0118] p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href={`/admin/store/${storeId}`} className="text-purple-400 hover:text-purple-300 text-sm mb-4 inline-block">← العودة للمتجر</Link>
          <h1 className="text-2xl font-bold text-white">ربط المنصات الإعلانية</h1>
          <p className="text-purple-300 mt-2">اربط حساباتك الإعلانية لجلب البيانات مباشرة</p>
        </div>

        <div className="grid gap-4">
          {platformsConfig.map((platform) => {
            const info = platforms[platform.key];
            const isConnected = info?.status === 'connected';
            const hasAdAccount = !!info?.ad_account_id;
            return (
              <div key={platform.key} className={`${platform.bgColor} border ${platform.borderColor} rounded-2xl p-6 ${platform.disabled ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={platform.textColor}><span className="text-2xl">{platform.key === 'snapchat' ? '👻' : platform.key === 'tiktok' ? '🎵' : platform.key === 'meta' ? '📘' : '🔍'}</span></div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{platform.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(info?.status || 'disconnected')}
                        {hasAdAccount && <span className="text-sm text-purple-300">الحساب: {info.ad_account_name}</span>}
                      </div>
                      {info?.error_message && <p className="text-xs text-red-400 mt-1">{info.error_message}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {platform.disabled ? <span className="text-sm text-gray-500">قريباً</span> : (
                      <>
                        {info?.status === 'disconnected' && <button onClick={() => handleConnect(platform.key)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors">ربط</button>}
                        {info?.status === 'connected' && !hasAdAccount && <button onClick={() => openSelectAccountModal(platform.key)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors">اختيار الحساب</button>}
                        {info?.status === 'connected' && hasAdAccount && (
                          <>
                            <button onClick={() => openSelectAccountModal(platform.key)} className="px-3 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded-xl transition-colors text-sm">تغيير</button>
                            <button onClick={() => handleDisconnect(platform.key)} className="px-3 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-400 rounded-xl transition-colors text-sm">فصل</button>
                          </>
                        )}
                        {info?.status === 'needs_reauth' && <button onClick={() => handleConnect(platform.key)} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition-colors">إعادة الربط</button>}
                        {info?.status === 'error' && <button onClick={() => handleConnect(platform.key)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors">إعادة المحاولة</button>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {showSelectModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">اختيار الحساب الإعلاني</h3>
              <div className="mb-4">
                <input type="text" placeholder="ابحث عن حساب..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-4 py-2 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white placeholder-purple-400 focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              {loadingAccounts ? (
                <div className="flex items-center justify-center py-8"><div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" /></div>
              ) : adAccounts.length === 0 ? (
                <p className="text-purple-300 text-center py-8">لا توجد حسابات إعلانية متاحة</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {adAccounts.filter(a => !searchQuery || a.ad_account_name?.toLowerCase().includes(searchQuery.toLowerCase()) || a.ad_account_id?.toLowerCase().includes(searchQuery.toLowerCase())).map((account) => (
                    <label key={account.ad_account_id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${selectedAccount === account.ad_account_id ? 'bg-purple-600/30 border border-purple-500' : 'bg-purple-900/30 border border-transparent hover:bg-purple-800/30'}`}>
                      <input type="radio" name="adAccount" value={account.ad_account_id} checked={selectedAccount === account.ad_account_id} onChange={(e) => setSelectedAccount(e.target.value)} className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-white font-medium">{account.ad_account_name}</p>
                        <p className="text-xs text-purple-400">{account.currency && `${account.currency} • `}{account.ad_account_id}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowSelectModal(false)} className="flex-1 px-4 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded-xl transition-colors">إلغاء</button>
                <button onClick={handleSaveAccount} disabled={!selectedAccount || savingAccount} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:text-purple-500 text-white rounded-xl transition-colors">{savingAccount ? 'جاري الحفظ...' : 'حفظ'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
