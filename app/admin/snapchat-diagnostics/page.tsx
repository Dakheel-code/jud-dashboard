'use client';

import { useState, useEffect } from 'react';

interface Store {
  id: string;
  name: string;
}

interface AdAccount {
  id: string;
  name: string;
  organization_id?: string;
  organization_name?: string;
}

interface TestResult {
  success: boolean;
  request_status: string;
  http_status: number;
  response_time_ms: number;
  diagnosis: string[];
  has_paging: boolean;
  next_link: string | null;
  [key: string]: any;
}

export default function SnapchatDiagnosticsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>('');
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult | null>>({});
  const [storesLoading, setStoresLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // جلب المتاجر من API
  useEffect(() => {
    async function fetchStores() {
      try {
        const res = await fetch('/api/admin/stores');
        const data = await res.json();
        if (data.stores) {
          setStores(data.stores);
        } else if (Array.isArray(data)) {
          setStores(data);
        }
      } catch (error) {
        console.error('Error fetching stores:', error);
      } finally {
        setStoresLoading(false);
      }
    }
    fetchStores();
  }, []);

  // اختبار Organizations عند اختيار متجر
  const testOrganizations = async () => {
    if (!selectedStore) return;
    setLoading('organizations');
    setResults(prev => ({ ...prev, organizations: null }));
    
    try {
      const res = await fetch(`/api/debug/snapchat/organizations?storeId=${selectedStore}`);
      const data = await res.json();
      setResults(prev => ({ ...prev, organizations: data }));
      
      // تحديث قائمة Ad Accounts
      if (data.ad_accounts) {
        setAdAccounts(data.ad_accounts);
        if (data.ad_accounts.length > 0 && !selectedAdAccount) {
          setSelectedAdAccount(data.ad_accounts[0].id);
        }
      }
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        organizations: {
          success: false,
          request_status: 'FETCH_ERROR',
          http_status: 0,
          response_time_ms: 0,
          diagnosis: [error.message],
          has_paging: false,
          next_link: null,
        },
      }));
    }
    setLoading(null);
  };

  // اختبار عام
  const runTest = async (testName: string, endpoint: string, params: Record<string, string> = {}) => {
    if (!selectedStore) return;
    setLoading(testName);
    setResults(prev => ({ ...prev, [testName]: null }));
    
    try {
      const queryParams = new URLSearchParams({
        storeId: selectedStore,
        ...params,
      });
      const res = await fetch(`/api/debug/snapchat/${endpoint}?${queryParams}`);
      const data = await res.json();
      setResults(prev => ({ ...prev, [testName]: data }));
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        [testName]: {
          success: false,
          request_status: 'FETCH_ERROR',
          http_status: 0,
          response_time_ms: 0,
          diagnosis: [error.message],
          has_paging: false,
          next_link: null,
        },
      }));
    }
    setLoading(null);
  };

  // تحميل الصفحة التالية
  const loadNextPage = async (testName: string, endpoint: string, nextLink: string) => {
    if (!selectedStore) return;
    setLoading(testName);
    
    try {
      const queryParams = new URLSearchParams({
        storeId: selectedStore,
        nextLink: nextLink,
      });
      const res = await fetch(`/api/debug/snapchat/${endpoint}?${queryParams}`);
      const data = await res.json();
      setResults(prev => ({ ...prev, [testName]: data }));
    } catch (error: any) {
      console.error('Error loading next page:', error);
    }
    setLoading(null);
  };

  const renderResult = (testName: string, result: TestResult | null) => {
    if (!result) return null;

    return (
      <div className="mt-4 space-y-4">
        {/* Status Header */}
        <div className={`p-4 rounded-lg ${result.success ? 'bg-green-900/30 border border-green-500' : 'bg-red-900/30 border border-red-500'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-2xl ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.success ? '✓' : '✗'}
              </span>
              <div>
                <p className="font-bold">{result.request_status}</p>
                <p className="text-sm text-gray-400">
                  HTTP {result.http_status} • {result.response_time_ms}ms
                </p>
              </div>
            </div>
            {result.has_paging && (
              <span className="px-3 py-1 bg-yellow-600 rounded text-sm">
                📄 Paginated
              </span>
            )}
          </div>
        </div>

        {/* Error Details - عرض الخطأ الفعلي */}
        {result.request_status === 'ERROR' && (
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg">
            <h4 className="font-bold mb-2 text-red-400">❌ تفاصيل الخطأ:</h4>
            <div className="space-y-2 text-sm">
              {result.error && (
                <p><span className="text-gray-400">Error:</span> <span className="text-red-300">{result.error}</span></p>
              )}
              {result.error_code && (
                <p><span className="text-gray-400">Error Code:</span> <span className="text-red-300">{result.error_code}</span></p>
              )}
              {result.debug_message && (
                <p><span className="text-gray-400">Debug Message:</span> <span className="text-yellow-300">{result.debug_message}</span></p>
              )}
            </div>
          </div>
        )}

        {/* Debug Info - معلومات URL */}
        {result.debug_info && (
          <div className="p-4 bg-purple-900/30 border border-purple-500 rounded-lg">
            <h4 className="font-bold mb-2 text-purple-400">🔗 Debug Info (URL):</h4>
            <div className="space-y-1 text-sm font-mono">
              <p><span className="text-gray-400">Final URL:</span> <span className="text-green-300 break-all">{result.debug_info.final_url}</span></p>
              <p><span className="text-gray-400">Base URL:</span> {result.debug_info.computed_base_url}</p>
              <p><span className="text-gray-400">Path:</span> {result.debug_info.computed_path}</p>
              <p><span className="text-gray-400">Ad Account ID:</span> {result.debug_info.ad_account_id_used}</p>
            </div>
          </div>
        )}

        {/* Diagnosis */}
        <div className="p-4 bg-gray-800 rounded-lg">
          <h4 className="font-bold mb-2 text-yellow-400">🔍 التشخيص:</h4>
          <ul className="space-y-1">
            {result.diagnosis?.map((d: string, i: number) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span>•</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Summary Stats */}
        {(result.organizations_count !== undefined || result.campaigns_count !== undefined || 
          result.ad_squads_count !== undefined || result.ads_count !== undefined || result.stats) && (
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="font-bold mb-2 text-blue-400">📊 ملخص:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {result.organizations_count !== undefined && (
                <div className="text-center p-2 bg-gray-700 rounded">
                  <p className="text-2xl font-bold">{result.organizations_count}</p>
                  <p className="text-xs text-gray-400">Organizations</p>
                </div>
              )}
              {result.ad_accounts_count !== undefined && (
                <div className="text-center p-2 bg-gray-700 rounded">
                  <p className="text-2xl font-bold">{result.ad_accounts_count}</p>
                  <p className="text-xs text-gray-400">Ad Accounts</p>
                </div>
              )}
              {result.campaigns_count !== undefined && (
                <div className="text-center p-2 bg-gray-700 rounded">
                  <p className="text-2xl font-bold">{result.campaigns_count}</p>
                  <p className="text-xs text-gray-400">Campaigns</p>
                </div>
              )}
              {result.ad_squads_count !== undefined && (
                <div className="text-center p-2 bg-gray-700 rounded">
                  <p className="text-2xl font-bold">{result.ad_squads_count}</p>
                  <p className="text-xs text-gray-400">Ad Squads</p>
                </div>
              )}
              {result.ads_count !== undefined && (
                <div className="text-center p-2 bg-gray-700 rounded">
                  <p className="text-2xl font-bold">{result.ads_count}</p>
                  <p className="text-xs text-gray-400">Ads</p>
                </div>
              )}
              {result.stats && (
                <>
                  <div className="text-center p-2 bg-gray-700 rounded">
                    <p className="text-2xl font-bold">{result.stats.impressions?.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Impressions</p>
                  </div>
                  <div className="text-center p-2 bg-gray-700 rounded">
                    <p className="text-2xl font-bold">{result.stats.clicks?.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Clicks</p>
                  </div>
                  <div className="text-center p-2 bg-gray-700 rounded">
                    <p className="text-2xl font-bold">{result.stats.spend?.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">Spend</p>
                  </div>
                  <div className="text-center p-2 bg-gray-700 rounded">
                    <p className="text-2xl font-bold">{result.stats.conversions}</p>
                    <p className="text-xs text-gray-400">Conversions</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Status Breakdown */}
        {result.status_breakdown && Object.keys(result.status_breakdown).length > 0 && (
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="font-bold mb-2 text-purple-400">📈 توزيع الحالات:</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.status_breakdown).map(([status, count]) => (
                <span key={status} className={`px-3 py-1 rounded text-sm ${
                  status === 'ACTIVE' ? 'bg-green-600' :
                  status === 'PAUSED' ? 'bg-yellow-600' :
                  'bg-gray-600'
                }`}>
                  {status}: {count as number}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Next Page Button */}
        {result.next_link && (
          <button
            onClick={() => {
              const endpoint = testName === 'campaigns' ? 'campaigns' :
                              testName === 'adSquads' ? 'ad-squads' :
                              testName === 'ads' ? 'ads' : '';
              if (endpoint) loadNextPage(testName, endpoint, result.next_link!);
            }}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold"
          >
            📄 Load Next Page
          </button>
        )}

        {/* Full JSON Response */}
        <details className="bg-gray-900 rounded-lg">
          <summary className="p-4 cursor-pointer hover:bg-gray-800 rounded-lg">
            🔧 عرض JSON الكامل
          </summary>
          <pre className="p-4 text-xs overflow-auto max-h-96 text-green-400">
            {JSON.stringify(result.full_response || result, null, 2)}
          </pre>
        </details>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🔧 Snapchat API Diagnostics</h1>
        <p className="text-gray-400 mb-6">أداة تشخيص لفحص تكامل Snapchat Ads API</p>

        {/* Selection Controls */}
        <div className="grid md:grid-cols-2 gap-4 mb-8 p-4 bg-gray-800 rounded-lg">
          <div>
            <label className="block text-sm font-bold mb-2">اختر المتجر:</label>
            <select
              value={selectedStore}
              onChange={(e) => {
                setSelectedStore(e.target.value);
                setAdAccounts([]);
                setSelectedAdAccount('');
                setResults({});
              }}
              className="w-full p-3 bg-gray-700 rounded-lg text-white"
            >
              <option value="">
                {storesLoading ? '⏳ جاري التحميل...' : `-- اختر متجر (${stores.length}) --`}
              </option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            {stores.length === 0 && !storesLoading && (
              <p className="text-red-400 text-sm mt-1">⚠️ لم يتم العثور على متاجر</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">اختر Ad Account:</label>
            <select
              value={selectedAdAccount}
              onChange={(e) => setSelectedAdAccount(e.target.value)}
              className="w-full p-3 bg-gray-700 rounded-lg text-white"
              disabled={adAccounts.length === 0}
            >
              <option value="">
                {adAccounts.length === 0 
                  ? '-- اضغط Organizations أولاً --' 
                  : `-- اختر حساب إعلاني (${adAccounts.length}) --`}
              </option>
              {adAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} {acc.organization_name ? `(${acc.organization_name})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range for Stats */}
        <div className="grid md:grid-cols-2 gap-4 mb-8 p-4 bg-gray-800 rounded-lg">
          <div>
            <label className="block text-sm font-bold mb-2">تاريخ البداية:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-3 bg-gray-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">تاريخ النهاية:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-3 bg-gray-700 rounded-lg"
            />
          </div>
        </div>

        {/* Test Buttons */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <button
            onClick={testOrganizations}
            disabled={!selectedStore || loading === 'organizations'}
            className="p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-bold transition"
          >
            {loading === 'organizations' ? '⏳' : '🏢'} Organizations
          </button>

          <button
            onClick={() => runTest('campaigns', 'campaigns', { adAccountId: selectedAdAccount })}
            disabled={!selectedAdAccount || loading === 'campaigns'}
            className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-bold transition"
          >
            {loading === 'campaigns' ? '⏳' : '📊'} Campaigns
          </button>

          <button
            onClick={() => runTest('adSquads', 'ad-squads', { adAccountId: selectedAdAccount })}
            disabled={!selectedAdAccount || loading === 'adSquads'}
            className="p-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-bold transition"
          >
            {loading === 'adSquads' ? '⏳' : '👥'} Ad Squads
          </button>

          <button
            onClick={() => runTest('ads', 'ads', { adAccountId: selectedAdAccount })}
            disabled={!selectedAdAccount || loading === 'ads'}
            className="p-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded-lg font-bold transition"
          >
            {loading === 'ads' ? '⏳' : '📢'} Ads
          </button>

          <button
            onClick={() => runTest('stats', 'stats', { 
              adAccountId: selectedAdAccount,
              startDate,
              endDate,
              granularity: 'TOTAL'
            })}
            disabled={!selectedAdAccount || loading === 'stats'}
            className="p-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-bold transition"
          >
            {loading === 'stats' ? '⏳' : '📈'} Stats
          </button>
        </div>

        {/* Run All Tests */}
        <button
          onClick={async () => {
            await testOrganizations();
            if (selectedAdAccount) {
              await runTest('campaigns', 'campaigns', { adAccountId: selectedAdAccount });
              await runTest('adSquads', 'ad-squads', { adAccountId: selectedAdAccount });
              await runTest('ads', 'ads', { adAccountId: selectedAdAccount });
              await runTest('stats', 'stats', { 
                adAccountId: selectedAdAccount,
                startDate,
                endDate,
                granularity: 'TOTAL'
              });
            }
          }}
          disabled={!selectedStore || !!loading}
          className="w-full mb-8 p-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 rounded-lg font-bold text-lg transition"
        >
          🚀 تشغيل جميع الاختبارات
        </button>

        {/* Results */}
        <div className="space-y-8">
          {results.organizations && (
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-xl font-bold mb-2">🏢 Test 1: Organizations + Roles</h3>
              {renderResult('organizations', results.organizations)}
            </div>
          )}

          {results.campaigns && (
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-xl font-bold mb-2">📊 Test 2: Campaigns</h3>
              {renderResult('campaigns', results.campaigns)}
            </div>
          )}

          {results.adSquads && (
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-xl font-bold mb-2">👥 Test 3: Ad Squads</h3>
              {renderResult('adSquads', results.adSquads)}
            </div>
          )}

          {results.ads && (
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-xl font-bold mb-2">📢 Test 4: Ads</h3>
              {renderResult('ads', results.ads)}
            </div>
          )}

          {results.stats && (
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-xl font-bold mb-2">📈 Test 5: Stats / Reporting</h3>
              {renderResult('stats', results.stats)}
            </div>
          )}
        </div>

        {/* Overall Diagnosis */}
        {Object.keys(results).length > 0 && (
          <div className="mt-8 p-6 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold mb-4">🎯 التشخيص الشامل</h3>
            <div className="space-y-2">
              {results.organizations?.success && results.organizations.ad_accounts_count > 0 && 
               results.campaigns?.campaigns_count === 0 && (
                <p className="text-yellow-400">
                  ⚠️ User likely does not have permission on this Ad Account - Organizations found but no campaigns
                </p>
              )}
              
              {results.campaigns?.campaigns_count > 0 && results.ads?.ads_count === 0 && (
                <p className="text-yellow-400">
                  ⚠️ Campaigns exist but no ads found - Campaigns may not have active ads
                </p>
              )}
              
              {results.ads?.ads_count > 0 && results.stats?.stats?.impressions === 0 && (
                <p className="text-yellow-400">
                  ⚠️ Ads exist but no stats - You may need Reporting endpoints or date range is empty
                </p>
              )}
              
              {Object.values(results).every(r => r?.success) && (
                <p className="text-green-400">
                  ✅ All tests passed! API integration is working correctly.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
