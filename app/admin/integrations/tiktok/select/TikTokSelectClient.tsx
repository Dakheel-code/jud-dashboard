'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface AdAccount {
  ad_account_id: string;
  ad_account_name: string;
  currency?: string;
  status?: string;
}

function TikTokSelectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const storeId = searchParams.get('storeId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const [selected, setSelected] = useState<AdAccount | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!storeId) { setError('معرف المتجر مفقود'); setLoading(false); return; }
    fetchAccounts();
  }, [storeId]);

  const fetchAccounts = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/integrations/tiktok/ad-accounts?storeId=${storeId}`);
      const data = await res.json();
      if (data.success) {
        setAccounts(data.accounts || []);
        if (data.accounts?.length === 1) setSelected(data.accounts[0]);
      } else {
        setError(data.error || 'فشل في جلب الحسابات الإعلانية');
      }
    } catch {
      setError('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selected || !storeId) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/integrations/tiktok/select-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          ad_account_id: selected.ad_account_id,
          ad_account_name: selected.ad_account_name,
        }),
      });
      const data = await res.json();
      setDebugInfo(data);
      if (data.success) {
        // data.redirect = /admin/store/{store_url}
        // نُضيف /integrations للعودة لصفحة الربط مع إظهار حالة "متصل"
        const base = data.redirect || `/admin/store/${storeId}`;
        router.push(`${base}/integrations?tiktok=connected`);
      } else {
        setError(data.error || 'فشل في حفظ الحساب');
      }
    } catch (e: any) {
      setError('خطأ في الاتصال: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = accounts.filter(a =>
    a.ad_account_name.toLowerCase().includes(search.toLowerCase()) ||
    a.ad_account_id.includes(search)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a1e] via-[#1a0a2e] to-[#0f0a1e] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-purple-950/40 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-pink-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">اختيار الحساب الإعلاني</h1>
          <p className="text-purple-300/70">اختر حساب TikTok for Business الذي تريد ربطه</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mb-4" />
            <p className="text-purple-300">جاري جلب الحسابات...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-6 text-center">
            <span className="text-3xl mb-3 block">⚠️</span>
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={fetchAccounts}
              className="px-4 py-2 rounded-lg bg-red-500/30 text-red-300 hover:bg-red-500/50 transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-6 text-center">
            <span className="text-3xl mb-3 block">📭</span>
            <p className="text-yellow-300 mb-2">لا توجد حسابات إعلانية</p>
            <p className="text-yellow-300/70 text-sm">تأكد من أن لديك حساباً إعلانياً في TikTok for Business</p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="mb-4 relative">
              <input
                type="text"
                placeholder="ابحث عن حساب..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-4 py-3 pr-10 rounded-xl bg-purple-900/30 border border-purple-500/30 text-white placeholder-purple-400/50 focus:outline-none focus:border-pink-500 transition-all"
              />
              <svg className="w-5 h-5 text-purple-400 absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Accounts List */}
            <div className="space-y-3 mb-6 max-h-72 overflow-y-auto">
              {filtered.map(acc => (
                <button
                  key={acc.ad_account_id}
                  onClick={() => setSelected(acc)}
                  className={`w-full p-4 rounded-xl text-right transition-all ${
                    selected?.ad_account_id === acc.ad_account_id
                      ? 'bg-pink-500/30 border-2 border-pink-500'
                      : 'bg-purple-900/30 border-2 border-transparent hover:bg-purple-900/50 hover:border-purple-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected?.ad_account_id === acc.ad_account_id
                        ? 'border-pink-500 bg-pink-500'
                        : 'border-purple-400'
                    }`}>
                      {selected?.ad_account_id === acc.ad_account_id && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 mr-3">
                      <p className="text-white font-medium">{acc.ad_account_name}</p>
                      <p className="text-purple-400 text-xs mt-1">{acc.ad_account_id}</p>
                      {acc.currency && (
                        <p className="text-purple-400/70 text-xs">العملة: {acc.currency}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Debug */}
            {debugInfo && !debugInfo.success && (
              <pre className="mb-4 text-[10px] text-red-300 bg-red-900/20 rounded p-2 overflow-x-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => router.back()}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-600/30 text-gray-300 hover:bg-gray-600/50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selected || saving}
                className="flex-1 px-4 py-3 rounded-xl bg-pink-500 text-white font-bold hover:bg-pink-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الحفظ...
                  </span>
                ) : 'تأكيد الربط'}
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
    <div className="min-h-screen bg-gradient-to-br from-[#0f0a1e] via-[#1a0a2e] to-[#0f0a1e] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
    </div>
  );
}

export default function TikTokSelectClient() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TikTokSelectContent />
    </Suspense>
  );
}
