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
    if (!storeId) { setError('معرف المتجر مفقود'); setLoading(false); return; }
    fetchAdAccounts();
  }, [storeId]);

  const fetchAdAccounts = async () => {
    try {
      const response = await fetch(`/api/integrations/snapchat/ad-accounts?storeId=${storeId}`);
      const result = await response.json();
      if (result.success && result.adAccounts) {
        setAdAccounts(result.adAccounts);
        if (result.adAccounts.length === 1) setSelectedAccount(result.adAccounts[0]);
      } else {
        setError(result.error || 'فشل في جلب الحسابات الإعلانية');
      }
    } catch (err) { console.error('Error fetching ad accounts:', err); setError('حدث خطأ في الاتصال'); }
    finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (!selectedAccount || !storeId) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch('/api/integrations/snapchat/select-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, ad_account_id: selectedAccount.id, ad_account_name: selectedAccount.name, organization_id: selectedAccount.organization_id }),
      });
      const result = await response.json();
      if (result.success) { router.push(`/admin/store/${result.store_url || storeId}?snapchat=connected`); }
      else setError(result.error || 'فشل في حفظ الحساب');
    } catch (err) { console.error('Error saving account:', err); setError('حدث خطأ في الاتصال'); }
    finally { setSaving(false); }
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
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <span className="text-4xl">👻</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">اختيار الحساب الإعلاني</h1>
          <p className="text-purple-300/70">اختر الحساب الإعلاني الذي تريد ربطه بالمتجر</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mb-4" />
            <p className="text-purple-300">جاري جلب الحسابات الإعلانية...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6 text-center">
            <span className="text-3xl mb-3 block">⚠️</span>
            <p className="text-red-300 mb-4">{error}</p>
            <button onClick={fetchAdAccounts} className="px-4 py-2 rounded-lg bg-red-500/30 text-red-300 hover:bg-red-500/50 transition-colors">إعادة المحاولة</button>
          </div>
        ) : adAccounts.length === 0 ? (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-6 text-center">
            <span className="text-3xl mb-3 block">📭</span>
            <p className="text-yellow-300 mb-2">لا توجد حسابات إعلانية</p>
            <p className="text-yellow-300/70 text-sm">تأكد من أن لديك حساب إعلاني في Snapchat Ads Manager</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="relative">
                <input type="text" placeholder="ابحث عن حساب..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-purple-900/30 border border-purple-500/30 text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all" />
                <svg className="w-5 h-5 text-purple-400 absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
              {adAccounts.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.id.toLowerCase().includes(searchQuery.toLowerCase())).map((account) => (
                <button key={account.id} onClick={() => setSelectedAccount(account)}
                  className={`w-full p-4 rounded-xl text-right transition-all ${selectedAccount?.id === account.id ? 'bg-yellow-500/30 border-2 border-yellow-500' : 'bg-purple-900/30 border-2 border-transparent hover:bg-purple-900/50 hover:border-purple-500/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedAccount?.id === account.id ? 'border-yellow-500 bg-yellow-500' : 'border-purple-400'}`}>
                      {selectedAccount?.id === account.id && <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div className="flex-1 mr-3">
                      <p className="text-white font-medium">{account.name}</p>
                      <p className="text-purple-400 text-xs mt-1">{account.id}</p>
                      {account.currency && <p className="text-purple-400/70 text-xs">العملة: {account.currency}</p>}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => router.back()} className="flex-1 px-4 py-3 rounded-xl bg-gray-600/30 text-gray-300 hover:bg-gray-600/50 transition-colors">إلغاء</button>
              <button onClick={handleConfirm} disabled={!selectedAccount || saving}
                className="flex-1 px-4 py-3 rounded-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <span className="flex items-center justify-center gap-2"><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />جاري الحفظ...</span> : 'تأكيد الربط'}
              </button>
            </div>
          </>
        )}

        <div className="mt-6 pt-6 border-t border-purple-500/20 text-center">
          <p className="text-purple-400/50 text-xs">Store ID: {storeId}</p>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a1e] via-[#1a0a2e] to-[#0f0a1e] flex items-center justify-center p-4">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mb-4" />
        <p className="text-purple-300">جاري التحميل...</p>
      </div>
    </div>
  );
}

export default function SnapchatSelectClient() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SelectAccountContent />
    </Suspense>
  );
}
