'use client';

import { useEffect, useState } from 'react';

interface GoogleAdsConnection {
  customer_id: string;
  customer_name: string | null;
  connected_at: string;
}

interface Props {
  storeId: string;
}

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const FIELDS = [
  { key: 'customer_id',     label: 'Customer ID',          hint: 'رقم حساب Google Ads (مثال: 123-456-7890)', type: 'text',     required: true },
  { key: 'client_id',       label: 'Client ID',            hint: 'من Google Cloud Console → OAuth 2.0',      type: 'text',     required: true },
  { key: 'client_secret',   label: 'Client Secret',        hint: 'من Google Cloud Console → OAuth 2.0',      type: 'password', required: true },
  { key: 'developer_token', label: 'Developer Token',      hint: 'من Google Ads → Tools → API Center',       type: 'password', required: true },
  { key: 'refresh_token',   label: 'Refresh Token',        hint: 'توكن دائم من OAuth Playground',            type: 'password', required: true },
  { key: 'manager_id',      label: 'Manager ID (اختياري)', hint: 'رقم حساب MCC إذا كنت تستخدم حساب مدير',   type: 'text',     required: false },
];

export default function GoogleAdsConnectButton({ storeId }: Props) {
  const [loading, setLoading]             = useState(true);
  const [connected, setConnected]         = useState(false);
  const [connections, setConnections]     = useState<GoogleAdsConnection[]>([]);
  const [showModal, setShowModal]         = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [success, setSuccess]             = useState(false);

  const [form, setForm] = useState({
    customer_id: '', client_id: '', client_secret: '',
    developer_token: '', refresh_token: '', manager_id: '',
  });

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/google-ads/status?store_id=${storeId}`);
      const data = await res.json();
      setConnected(data.connected ?? false);
      setConnections(data.connections ?? []);
    } catch { setConnected(false); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, [storeId]);

  const openModal = () => { setError(null); setSuccess(false); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res  = await fetch('/api/google-ads/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'فشل في الربط'); }
      else {
        setSuccess(true);
        setTimeout(() => { closeModal(); fetchStatus(); }, 1200);
      }
    } catch { setError('خطأ في الاتصال بالخادم'); }
    finally  { setSubmitting(false); }
  };

  const handleDisconnect = async () => {
    if (!confirm('هل أنت متأكد من فصل ربط Google Ads؟')) return;
    setDisconnecting(true);
    try {
      await fetch(`/api/google-ads/status?store_id=${storeId}`, { method: 'DELETE' });
      setConnected(false);
      setConnections([]);
    } catch {}
    finally { setDisconnecting(false); }
  };

  // ─── Skeleton ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-purple-500/20 p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-900/40" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-purple-900/40 rounded w-28" />
            <div className="h-3 bg-purple-900/30 rounded w-20" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ─── بطاقة الحالة ─────────────────────────────────────────────────── */}
      <div className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${
        connected ? 'bg-green-500/5 border-green-500/20' : 'bg-purple-900/20 border-purple-500/20'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
            connected ? 'bg-white border-gray-200' : 'bg-purple-900/40 border-purple-500/20'
          }`}>
            <GoogleIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Google Ads</p>
            {connected ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                <span className="text-xs text-green-400 truncate">
                  {connections[0]?.customer_name || connections[0]?.customer_id || 'متصل'}
                </span>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-0.5">غير مرتبط</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {connected ? (
            <>
              <button onClick={handleDisconnect} disabled={disconnecting}
                className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50">
                {disconnecting ? '...' : 'فصل'}
              </button>
              <button onClick={openModal}
                className="px-3 py-1.5 text-xs rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all">
                تعديل
              </button>
            </>
          ) : (
            <button onClick={openModal}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-lg bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 transition-all">
              <GoogleIcon className="w-4 h-4" />
              ربط Google Ads
            </button>
          )}
        </div>
      </div>

      {/* ─── Modal ────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}>
          <div className="bg-[#1a0a2e] border border-green-500/30 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()} dir="rtl">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-gray-200">
                  <GoogleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">ربط Google Ads</h3>
                  <p className="text-xs text-purple-400/70">أدخل بيانات الاتصال</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-purple-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* نجاح */}
            {success ? (
              <div className="py-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-400 font-bold text-lg">تم الربط بنجاح!</p>
                <p className="text-purple-400/60 text-sm mt-1">جاري التحديث...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                {error && (
                  <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    ⚠️ {error}
                  </div>
                )}

                {FIELDS.map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-purple-300 mb-1">
                      {field.label}
                      {!field.required && <span className="text-purple-500/50 mr-1">(اختياري)</span>}
                    </label>
                    <input
                      type={field.type}
                      value={(form as any)[field.key]}
                      onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                      required={field.required}
                      placeholder={field.hint}
                      className="w-full px-3 py-2.5 text-sm bg-purple-900/30 border border-purple-500/30 text-white rounded-xl focus:ring-1 focus:ring-green-500 focus:border-green-400 outline-none placeholder:text-purple-400/30 transition-all"
                    />
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-2">
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-green-600 text-white hover:bg-green-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        جاري التحقق...
                      </>
                    ) : (
                      <>{connected ? 'تحديث الإعدادات' : 'ربط Google Ads'}</>
                    )}
                  </button>
                  <button type="button" onClick={closeModal}
                    className="px-4 py-2.5 text-sm rounded-xl bg-purple-900/40 border border-purple-500/20 text-purple-300 hover:bg-purple-900/60 transition-all">
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
