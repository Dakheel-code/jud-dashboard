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

export default function IntegrationsPage() {
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

  // جلب حالة المنصات
  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/integrations/status?storeId=${storeId}`);
      const data = await response.json();
      if (data.success) {
        setPlatforms(data.platforms);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [storeId]);

  // فتح نافذة اختيار الحساب إذا جاء من callback
  useEffect(() => {
    if (platformParam && stepParam === 'select-account') {
      openSelectAccountModal(platformParam);
    }
  }, [platformParam, stepParam]);

  // بدء الربط
  const handleConnect = (platform: string) => {
    if (platform === 'snapchat') {
      // إعادة التوجيه لصفحة المتجر مع فتح modal اختيار الهوية
      window.location.href = `/admin/store/${storeId}?connect=snapchat`;
      return;
    }
    window.location.href = `/api/integrations/${platform}/start?storeId=${storeId}`;
  };

  // فتح نافذة اختيار الحساب
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
        // إذا كان هناك حساب واحد فقط، اختره تلقائياً
        if (data.accounts.length === 1) {
          setSelectedAccount(data.accounts[0].ad_account_id);
        }
      } else if (data.needsReauth) {
        alert('انتهت صلاحية الربط. يرجى إعادة الربط.');
        setShowSelectModal(false);
      }
    } catch (error) {
      console.error('Failed to fetch ad accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // حفظ الحساب المختار
  const handleSaveAccount = async () => {
    if (!selectedAccount || !currentPlatform) return;

    const account = adAccounts.find((a) => a.ad_account_id === selectedAccount);
    if (!account) return;

    setSavingAccount(true);
    try {
      const response = await fetch(`/api/integrations/${currentPlatform}/select-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          ad_account_id: account.ad_account_id,
          ad_account_name: account.ad_account_name,
          organization_id: account.organization_id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowSelectModal(false);
        fetchStatus();
        // إعادة التوجيه لصفحة المتجر
        window.location.href = `/admin/store/${storeId}`;
      } else {
        alert('فشل في حفظ الحساب: ' + (data.error || 'خطأ غير معروف'));
      }
    } catch (error) {
      console.error('Failed to save account:', error);
      alert('حدث خطأ');
    } finally {
      setSavingAccount(false);
    }
  };

  // فصل الربط
  const handleDisconnect = async (platform: string) => {
    if (!confirm('هل أنت متأكد من فصل الربط؟')) return;

    try {
      const response = await fetch(`/api/integrations/${platform}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      });

      const data = await response.json();
      if (data.success) {
        fetchStatus();
      } else {
        alert('فشل في فصل الربط');
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
      alert('حدث خطأ');
    }
  };

  const platformsConfig = [
    {
      key: 'snapchat',
      name: 'Snapchat Ads',
      color: 'yellow',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      textColor: 'text-yellow-400',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 512 512" fill="currentColor">
          <path d="M496.926,366.6c-3.373-9.176-9.8-14.086-17.112-18.153-1.376-.806-2.641-1.451-3.72-1.947-2.182-1.128-4.414-2.22-6.634-3.373-22.8-12.09-40.609-27.341-52.959-45.42a102.889,102.889,0,0,1-9.089-16.269c-1.054-2.766-.992-4.377-.065-5.954a11.249,11.249,0,0,1,3.088-2.818c2.766-1.8,5.669-3.373,8.2-4.7,4.7-2.5,8.5-4.5,10.9-5.954,7.287-4.477,12.5-9.4,15.5-14.629a24.166,24.166,0,0,0,1.863-22.031c-4.328-12.266-17.9-19.263-28.263-19.263a35.007,35.007,0,0,0-9.834,1.376c-.124.037-.236.074-.347.111,0-1.451.024-2.915.024-4.377,0-22.92-2.508-46.152-10.9-67.615C378.538,91.727,341.063,56.7,286.741,50.6a118.907,118.907,0,0,0-12.293-.621h-36.9a118.907,118.907,0,0,0-12.293.621c-54.31,6.1-91.785,41.127-110.839,84.168-8.4,21.463-10.9,44.7-10.9,67.615,0,1.462.012,2.926.024,4.377-.111-.037-.223-.074-.347-.111a35.007,35.007,0,0,0-9.834-1.376c-10.362,0-23.935,7-28.263,19.263a24.166,24.166,0,0,0,1.863,22.031c3,5.233,8.213,10.152,15.5,14.629,2.4,1.451,6.2,3.46,10.9,5.954,2.52,1.327,5.418,2.9,8.181,4.7a11.3,11.3,0,0,1,3.088,2.818c.927,1.576.989,3.187-.065,5.954a102.889,102.889,0,0,1-9.089,16.269c-12.35,18.079-30.161,33.33-52.959,45.42-2.22,1.153-4.452,2.245-6.634,3.373-1.079.5-2.344,1.141-3.72,1.947-7.312,4.067-13.739,8.977-17.112,18.153-3.6,9.834-1.044,20.882,7.6,32.838,8.7,12.017,20.018,18.4,33.787,19.016,4.278.2,8.7-.161,13.168-.533,3.9-.322,7.9-.657,11.778-.657a53.666,53.666,0,0,1,9.725.806,51.1,51.1,0,0,1,3.249.818c.682,1.054,1.376,2.182,2.108,3.4,4.7,7.823,11.168,18.54,24.077,29.2,13.8,11.4,32.018,21.041,57.271,28.489a12.478,12.478,0,0,1,3.633,1.54,11.5,11.5,0,0,1,1.985,1.985c3.088,4.278,8.083,7.947,15.259,11.242,8.362,3.844,18.8,6.746,31.1,8.635a245.762,245.762,0,0,0,37.238,2.817c12.8,0,25.371-.918,37.238-2.817,12.3-1.889,22.738-4.791,31.1-8.635,7.176-3.3,12.171-6.964,15.259-11.242a11.5,11.5,0,0,1,1.985-1.985,12.478,12.478,0,0,1,3.633-1.54c25.253-7.448,43.469-17.087,57.271-28.489,12.909-10.659,19.375-21.376,24.077-29.2.732-1.215,1.426-2.344,2.108-3.4a51.1,51.1,0,0,1,3.249-.818,53.666,53.666,0,0,1,9.725-.806c3.879,0,7.882.335,11.778.657,4.465.372,8.89.731,13.168.533,13.769-.62,25.091-7,33.787-19.016C497.97,387.482,500.526,376.434,496.926,366.6Z"/>
        </svg>
      ),
    },
    {
      key: 'tiktok',
      name: 'TikTok for Business',
      color: 'white',
      bgColor: 'bg-gray-800/50',
      borderColor: 'border-gray-600/30',
      textColor: 'text-white',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
        </svg>
      ),
      disabled: true,
    },
    {
      key: 'meta',
      name: 'Meta (Facebook/Instagram)',
      color: 'blue',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-400',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 008.44-9.9c0-5.53-4.5-10.02-10-10.02z"/>
        </svg>
      ),
      disabled: true,
    },
    {
      key: 'google',
      name: 'Google Ads',
      color: 'green',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-400',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      ),
      disabled: true,
    },
  ];

  const getStatusBadge = (status: PlatformStatus) => {
    switch (status) {
      case 'connected':
        return <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">متصل</span>;
      case 'needs_reauth':
        return <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded-full">يحتاج إعادة ربط</span>;
      case 'error':
        return <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full">خطأ</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded-full">غير متصل</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0118] p-6" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/admin/store/${storeId}`} className="text-purple-400 hover:text-purple-300 text-sm mb-4 inline-block">
            ← العودة للمتجر
          </Link>
          <h1 className="text-2xl font-bold text-white">ربط المنصات الإعلانية</h1>
          <p className="text-purple-300 mt-2">اربط حساباتك الإعلانية لجلب البيانات مباشرة</p>
        </div>

        {/* Platform Cards */}
        <div className="grid gap-4">
          {platformsConfig.map((platform) => {
            const info = platforms[platform.key];
            const isConnected = info?.status === 'connected';
            const hasAdAccount = !!info?.ad_account_id;

            return (
              <div
                key={platform.key}
                className={`${platform.bgColor} border ${platform.borderColor} rounded-2xl p-6 ${platform.disabled ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={platform.textColor}>{platform.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{platform.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(info?.status || 'disconnected')}
                        {hasAdAccount && (
                          <span className="text-sm text-purple-300">
                            الحساب: {info.ad_account_name}
                          </span>
                        )}
                      </div>
                      {info?.error_message && (
                        <p className="text-xs text-red-400 mt-1">{info.error_message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {platform.disabled ? (
                      <span className="text-sm text-gray-500">قريباً</span>
                    ) : (
                      <>
                        {info?.status === 'disconnected' && (
                          <button
                            onClick={() => handleConnect(platform.key)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors"
                          >
                            ربط
                          </button>
                        )}
                        {info?.status === 'connected' && !hasAdAccount && (
                          <button
                            onClick={() => openSelectAccountModal(platform.key)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
                          >
                            اختيار الحساب
                          </button>
                        )}
                        {info?.status === 'connected' && hasAdAccount && (
                          <>
                            <button
                              onClick={() => openSelectAccountModal(platform.key)}
                              className="px-3 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded-xl transition-colors text-sm"
                            >
                              تغيير
                            </button>
                            <button
                              onClick={() => handleDisconnect(platform.key)}
                              className="px-3 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-400 rounded-xl transition-colors text-sm"
                            >
                              فصل
                            </button>
                          </>
                        )}
                        {info?.status === 'needs_reauth' && (
                          <button
                            onClick={() => handleConnect(platform.key)}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition-colors"
                          >
                            إعادة الربط
                          </button>
                        )}
                        {info?.status === 'error' && (
                          <button
                            onClick={() => handleConnect(platform.key)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors"
                          >
                            إعادة المحاولة
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Select Account Modal */}
        {showSelectModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">اختيار الحساب الإعلاني</h3>

              {/* حقل البحث */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="ابحث عن حساب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 bg-purple-900/50 border border-purple-500/30 rounded-xl text-white placeholder-purple-400 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              {loadingAccounts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                </div>
              ) : adAccounts.length === 0 ? (
                <p className="text-purple-300 text-center py-8">لا توجد حسابات إعلانية متاحة</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {adAccounts
                    .filter(account => 
                      !searchQuery || 
                      account.ad_account_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      account.ad_account_id?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((account) => (
                      <label
                        key={account.ad_account_id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        selectedAccount === account.ad_account_id
                          ? 'bg-purple-600/30 border border-purple-500'
                          : 'bg-purple-900/30 border border-transparent hover:bg-purple-800/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="adAccount"
                        value={account.ad_account_id}
                        checked={selectedAccount === account.ad_account_id}
                        onChange={(e) => setSelectedAccount(e.target.value)}
                        className="w-4 h-4 text-purple-600"
                      />
                      <div>
                        <p className="text-white font-medium">{account.ad_account_name}</p>
                        <p className="text-xs text-purple-400">
                          {account.currency && `${account.currency} • `}
                          {account.ad_account_id}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSelectModal(false)}
                  className="flex-1 px-4 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveAccount}
                  disabled={!selectedAccount || savingAccount}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:text-purple-500 text-white rounded-xl transition-colors"
                >
                  {savingAccount ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
