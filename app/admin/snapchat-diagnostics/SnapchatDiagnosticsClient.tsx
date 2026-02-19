'use client';

import { useState, useEffect } from 'react';

interface Store { id: string; name?: string; store_name?: string; }
interface AdAccount { id?: string; name?: string; organization_id?: string; organization_name?: string; [key: string]: any; }
interface TestResult { success: boolean; request_status: string; http_status: number; response_time_ms: number; diagnosis: string[]; has_paging: boolean; next_link: string | null; [key: string]: any; }

export default function SnapchatDiagnosticsClient() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>('');
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult | null>>({});
  const [storesLoading, setStoresLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [statsLevel, setStatsLevel] = useState<string>('AD_ACCOUNT');

  useEffect(() => {
    async function fetchStores() {
      try {
        const res = await fetch('/api/admin/stores');
        const data = await res.json();
        if (data.stores) setStores(data.stores);
        else if (Array.isArray(data)) setStores(data);
      } catch (error) { console.error('Error fetching stores:', error); }
      finally { setStoresLoading(false); }
    }
    fetchStores();
  }, []);

  const testOrganizations = async () => {
    if (!selectedStore) return;
    setLoading('organizations');
    setResults(prev => ({ ...prev, organizations: null }));
    try {
      const res = await fetch(`/api/debug/snapchat/organizations?storeId=${selectedStore}`);
      const data = await res.json();
      setResults(prev => ({ ...prev, organizations: data }));
      if (data.ad_accounts) {
        setAdAccounts(data.ad_accounts);
        if (data.ad_accounts.length > 0 && !selectedAdAccount) setSelectedAdAccount(data.ad_accounts[0].id);
      }
    } catch (error: any) {
      setResults(prev => ({ ...prev, organizations: { success: false, request_status: 'FETCH_ERROR', http_status: 0, response_time_ms: 0, diagnosis: [error.message], has_paging: false, next_link: null } }));
    }
    setLoading(null);
  };

  const runTest = async (testName: string, endpoint: string, params: Record<string, string> = {}) => {
    if (!selectedStore) return;
    setLoading(testName);
    setResults(prev => ({ ...prev, [testName]: null }));
    try {
      const queryParams = new URLSearchParams({ storeId: selectedStore, ...params });
      const res = await fetch(`/api/debug/snapchat/${endpoint}?${queryParams}`);
      const data = await res.json();
      setResults(prev => ({ ...prev, [testName]: data }));
    } catch (error: any) {
      setResults(prev => ({ ...prev, [testName]: { success: false, request_status: 'FETCH_ERROR', http_status: 0, response_time_ms: 0, diagnosis: [error.message], has_paging: false, next_link: null } }));
    }
    setLoading(null);
  };

  const loadNextPage = async (testName: string, endpoint: string, nextLink: string) => {
    if (!selectedStore) return;
    setLoading(testName);
    try {
      const queryParams = new URLSearchParams({ storeId: selectedStore, nextLink });
      const res = await fetch(`/api/debug/snapchat/${endpoint}?${queryParams}`);
      const data = await res.json();
      setResults(prev => ({ ...prev, [testName]: data }));
    } catch (error: any) { console.error('Error loading next page:', error); }
    setLoading(null);
  };

  const renderResult = (testName: string, result: TestResult | null) => {
    if (!result) return null;
    return (
      <div className="mt-4 space-y-4">
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-900/30 border border-green-500' : 'bg-red-900/30 border border-red-500'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-2xl ${result.success ? 'text-green-400' : 'text-red-400'}`}>{result.success ? '✓' : '✗'}</span>
              <div>
                <p className="font-bold">{result.request_status}</p>
                <p className="text-sm text-gray-400">HTTP {result.http_status} • {result.response_time_ms}ms</p>
              </div>
            </div>
            {result.has_paging && <span className="px-3 py-1 bg-yellow-600 rounded text-sm">📄 Paginated</span>}
          </div>
        </div>
        {result.diagnosis && (
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="font-bold mb-2 text-yellow-400">🔍 التشخيص:</h4>
            <ul className="space-y-1">{result.diagnosis.map((d: string, i: number) => <li key={i} className="text-sm flex items-start gap-2"><span>•</span><span>{d}</span></li>)}</ul>
          </div>
        )}
        {result.next_link && (
          <button onClick={() => { const ep = testName === 'campaigns' ? 'campaigns' : testName === 'adSquads' ? 'ad-squads' : testName === 'ads' ? 'ads' : ''; if (ep) loadNextPage(testName, ep, result.next_link!); }}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold">📄 Load Next Page</button>
        )}
        <details className="bg-gray-900 rounded-lg">
          <summary className="p-4 cursor-pointer hover:bg-gray-800 rounded-lg">🔧 عرض JSON الكامل</summary>
          <pre className="p-4 text-xs overflow-auto max-h-96 text-green-400">{JSON.stringify(result.full_response || result, null, 2)}</pre>
        </details>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🔧 Snapchat API Diagnostics</h1>
        <p className="text-gray-400 mb-6">أداة تشخيص لفحص تكامل Snapchat Ads API</p>

        <div className="grid md:grid-cols-2 gap-4 mb-8 p-4 bg-gray-800 rounded-lg">
          <div>
            <label className="block text-sm font-bold mb-2">اختر المتجر:</label>
            <select value={selectedStore} onChange={(e) => { setSelectedStore(e.target.value); setAdAccounts([]); setSelectedAdAccount(''); setResults({}); }} className="w-full p-3 bg-gray-700 rounded-lg text-white">
              <option value="">{storesLoading ? '⏳ جاري التحميل...' : `-- اختر متجر (${stores.length}) --`}</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.store_name || store.name || 'متجر بدون اسم'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">اختر Ad Account:</label>
            <select value={selectedAdAccount} onChange={(e) => setSelectedAdAccount(e.target.value)} className="w-full p-3 bg-gray-700 rounded-lg text-white" disabled={adAccounts.length === 0}>
              <option value="">{adAccounts.length === 0 ? '-- اضغط Organizations أولاً --' : `-- اختر حساب إعلاني (${adAccounts.length}) --`}</option>
              {adAccounts.map((acc, i) => <option key={acc.id || `acc-${i}`} value={acc.id || ''}>{acc.name || 'Unknown'}</option>)}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <button onClick={testOrganizations} disabled={!selectedStore || loading === 'organizations'} className="p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-bold transition">{loading === 'organizations' ? '⏳' : '🏢'} Organizations</button>
          <button onClick={() => runTest('campaigns', 'campaigns', { adAccountId: selectedAdAccount })} disabled={!selectedAdAccount || loading === 'campaigns'} className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-bold transition">{loading === 'campaigns' ? '⏳' : '📊'} Campaigns</button>
          <button onClick={() => runTest('adSquads', 'ad-squads', { adAccountId: selectedAdAccount })} disabled={!selectedAdAccount || loading === 'adSquads'} className="p-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-bold transition">{loading === 'adSquads' ? '⏳' : '👥'} Ad Squads</button>
          <button onClick={() => runTest('ads', 'ads', { adAccountId: selectedAdAccount })} disabled={!selectedAdAccount || loading === 'ads'} className="p-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded-lg font-bold transition">{loading === 'ads' ? '⏳' : '📢'} Ads</button>
          <button onClick={async () => { await testOrganizations(); if (selectedAdAccount) { await runTest('campaigns', 'campaigns', { adAccountId: selectedAdAccount }); await runTest('adSquads', 'ad-squads', { adAccountId: selectedAdAccount }); await runTest('ads', 'ads', { adAccountId: selectedAdAccount }); } }} disabled={!selectedStore || !!loading} className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 rounded-lg font-bold transition">🚀 الكل</button>
        </div>

        <div className="space-y-8">
          {results.organizations && <div className="p-4 bg-gray-800 rounded-lg"><h3 className="text-xl font-bold mb-2">🏢 Test 1: Organizations</h3>{renderResult('organizations', results.organizations)}</div>}
          {results.campaigns && <div className="p-4 bg-gray-800 rounded-lg"><h3 className="text-xl font-bold mb-2">📊 Test 2: Campaigns</h3>{renderResult('campaigns', results.campaigns)}</div>}
          {results.adSquads && <div className="p-4 bg-gray-800 rounded-lg"><h3 className="text-xl font-bold mb-2">👥 Test 3: Ad Squads</h3>{renderResult('adSquads', results.adSquads)}</div>}
          {results.ads && <div className="p-4 bg-gray-800 rounded-lg"><h3 className="text-xl font-bold mb-2">📢 Test 4: Ads</h3>{renderResult('ads', results.ads)}</div>}
        </div>
      </div>
    </div>
  );
}
