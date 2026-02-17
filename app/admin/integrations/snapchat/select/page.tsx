'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface AdAccount {
  id: string;
  name: string;
  organization_id: string;
  status?: string;
  currency?: string;
}

function SelectAccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const storeId = searchParams.get('storeId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!storeId) {
      setError('معرف المتجر مفقود');
      setLoading(false);
      return;
    }

    fetchAdAccounts();
  }, [storeId]);

  const fetchAdAccounts = async () => {
    try {
      const response = await fetch(`/api/integrations/snapchat/ad-accounts?storeId=${storeId}`);
      const result = await response.json();
      
      if (result.success && result.adAccounts) {
        setAdAccounts(result.adAccounts);
        // إذا كان هناك حساب واحد فقط، اختره تلقائياً
        if (result.adAccounts.length === 1) {
          setSelectedAccount(result.adAccounts[0]);
        }
      } else {
        setError(result.error || 'فشل في جلب الحسابات الإعلانية');
      }
    } catch (err) {
      console.error('Error fetching ad accounts:', err);
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedAccount || !storeId) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/integrations/snapchat/select-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          ad_account_id: selectedAccount.id,
          ad_account_name: selectedAccount.name,
          organization_id: selectedAccount.organization_id,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // الانتقال لصفحة المتجر مع علامة نجاح
        router.push(`/admin/store/${storeId}?snapchat=connected`);
      } else {
        setError(result.error || 'فشل في حفظ الحساب');
      }
    } catch (err) {
      console.error('Error saving account:', err);
      setError('حدث خطأ في الاتصال');
    } finally {
      setSaving(false);
    }
  };

  if (!storeId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0a1e] via-[#1a0a2e] to-[#0f0a1e] flex items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6 text-center max-w-md">
          <span className="text-4xl mb-4 block">❌</span>
          <h2 className="text-xl font-bold text-white mb-2">خطأ</h2>
          <p className="text-red-300">معرف المتجر مفقود في الرابط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a1e] via-[#1a0a2e] to-[#0f0a1e] flex items-center justify-center p-4">
      <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-yellow-400" viewBox="0 0 512 512" fill="currentColor">
              <path d="M496.926,366.6c-3.373-9.176-9.8-14.086-17.112-18.153-1.376-.806-2.641-1.451-3.72-1.947-2.182-1.128-4.414-2.22-6.634-3.373-22.8-12.09-40.609-27.341-52.959-45.42a102.889,102.889,0,0,1-9.089-16.269c-1.054-2.766-.992-4.377-.065-5.954a11.249,11.249,0,0,1,3.088-2.818c2.766-1.8,5.669-3.373,8.2-4.7,4.7-2.5,8.5-4.5,10.9-5.954,7.287-4.477,12.5-9.4,15.5-14.629a24.166,24.166,0,0,0,1.863-22.031c-4.328-12.266-17.9-19.263-28.263-19.263a35.007,35.007,0,0,0-9.834,1.376c-.124.037-.236.074-.347.111,0-1.451.024-2.915.024-4.377,0-22.92-2.508-46.152-10.9-67.615C378.538,91.727,341.063,56.7,286.741,50.6a118.907,118.907,0,0,0-12.293-.621h-36.9a118.907,118.907,0,0,0-12.293.621c-54.31,6.1-91.785,41.127-110.839,84.168-8.4,21.463-10.9,44.7-10.9,67.615,0,1.462.012,2.926.024,4.377-.111-.037-.223-.074-.347-.111a35.007,35.007,0,0,0-9.834-1.376c-10.362,0-23.935,7-28.263,19.263a24.166,24.166,0,0,0,1.863,22.031c3,5.233,8.213,10.152,15.5,14.629,2.4,1.451,6.2,3.46,10.9,5.954,2.52,1.327,5.418,2.9,8.181,4.7a11.3,11.3,0,0,1,3.088,2.818c.927,1.576.989,3.187-.065,5.954a102.889,102.889,0,0,1-9.089,16.269c-12.35,18.079-30.161,33.33-52.959,45.42-2.22,1.153-4.452,2.245-6.634,3.373-1.079.5-2.344,1.141-3.72,1.947-7.312,4.067-13.739,8.977-17.112,18.153-3.6,9.834-1.044,20.882,7.6,32.838a71.2,71.2,0,0,0,33.787,19.016c4.278.2,8.7-.161,13.168-.533,3.9-.322,7.9-.657,11.778-.657a53.666,53.666,0,0,1,9.725.806c.682,1.054,1.376,2.182,2.108,3.4,4.7,7.823,11.168,18.54,24.077,29.2,13.8,11.4,32.018,21.041,57.271,28.489a12.478,12.478,0,0,1,3.633,1.54c3.088,4.278,8.083,7.947,15.259,11.242,8.362,3.844,18.8,6.746,31.1,8.635a245.762,245.762,0,0,0,37.238,2.817c12.8,0,25.371-.918,37.238-2.817,12.3-1.889,22.738-4.791,31.1-8.635,7.176-3.3,12.171-6.964,15.259-11.242a12.478,12.478,0,0,1,3.633-1.54c25.253-7.448,43.469-17.087,57.271-28.489,12.909-10.659,19.375-21.376,24.077-29.2.732-1.215,1.426-2.344,2.108-3.4a53.666,53.666,0,0,1,9.725-.806c3.881,0,7.874.335,11.778.657,4.464.372,8.89.732,13.168.533a71.2,71.2,0,0,0,33.787-19.016C497.97,387.482,500.526,376.434,496.926,366.6Z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">اختيار الحساب الإعلاني</h1>
          <p className="text-purple-300/70">اختر الحساب الإعلاني الذي تريد ربطه بالمتجر</p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-3 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
            <p className="text-purple-300">جاري جلب الحسابات الإعلانية...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6 text-center">
            <span className="text-3xl mb-3 block">⚠️</span>
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={fetchAdAccounts}
              className="px-4 py-2 rounded-lg bg-red-500/30 text-red-300 hover:bg-red-500/50 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : adAccounts.length === 0 ? (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-6 text-center">
            <span className="text-3xl mb-3 block">📭</span>
            <p className="text-yellow-300 mb-2">لا توجد حسابات إعلانية</p>
            <p className="text-yellow-300/70 text-sm">تأكد من أن لديك حساب إعلاني في Snapchat Ads Manager</p>
          </div>
        ) : (
          <>
            {/* Search Input */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث عن حساب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-purple-900/30 border border-purple-500/30 text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                />
                <svg className="w-5 h-5 text-purple-400 absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Ad Accounts List */}
            <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
              {adAccounts.filter(account => 
                account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                account.id.toLowerCase().includes(searchQuery.toLowerCase())
              ).map((account) => (
                <button
                  key={account.id}
                  onClick={() => setSelectedAccount(account)}
                  className={`w-full p-4 rounded-xl text-right transition-all ${
                    selectedAccount?.id === account.id
                      ? 'bg-yellow-500/30 border-2 border-yellow-500'
                      : 'bg-purple-900/30 border-2 border-transparent hover:bg-purple-900/50 hover:border-purple-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedAccount?.id === account.id
                        ? 'border-yellow-500 bg-yellow-500'
                        : 'border-purple-400'
                    }`}>
                      {selectedAccount?.id === account.id && (
                        <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 mr-3">
                      <p className="text-white font-medium">{account.name}</p>
                      <p className="text-purple-400 text-xs mt-1">{account.id}</p>
                      {account.currency && (
                        <p className="text-purple-400/70 text-xs">العملة: {account.currency}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => router.back()}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-600/30 text-gray-300 hover:bg-gray-600/50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedAccount || saving}
                className="flex-1 px-4 py-3 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                    جاري الحفظ...
                  </span>
                ) : (
                  'تأكيد الربط'
                )}
              </button>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-purple-500/20 text-center">
          <p className="text-purple-400/50 text-xs">
            Store ID: {storeId}
          </p>
        </div>
      </div>
    </div>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a1e] via-[#1a0a2e] to-[#0f0a1e] flex items-center justify-center p-4">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-3 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
        <p className="text-purple-300">جاري التحميل...</p>
      </div>
    </div>
  );
}

// Main export with Suspense
export default function SnapchatSelectAccountPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SelectAccountContent />
    </Suspense>
  );
}
