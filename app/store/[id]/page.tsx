'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface StoreInfo {
  id: string;
  store_name: string | null;
  store_url: string;
  status: string;
}

interface CreativeRequest {
  id: string;
  title: string;
  request_type: string;
  status: string;
  priority: string;
  platform?: string;
  description?: string;
  result_files?: string[];
  client_feedback?: string | null;
  client_feedback_note?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  design: 'تصميم', video: 'فيديو', photo: 'صورة', copy: 'محتوى', other: 'أخرى',
};

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  new:               { label: 'جديد',             color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',     dot: 'bg-blue-400' },
  waiting_info:      { label: 'بانتظار معلومات',  color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' },
  in_progress:       { label: 'قيد التنفيذ',      color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' },
  review:            { label: 'جاهز للمراجعة',    color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
  done:              { label: 'مكتمل',            color: 'bg-green-500/15 text-green-400 border-green-500/30',   dot: 'bg-green-400' },
  rejected:          { label: 'مرفوض',            color: 'bg-red-500/15 text-red-400 border-red-500/30',        dot: 'bg-red-400' },
  canceled:          { label: 'ملغي',             color: 'bg-gray-500/15 text-gray-400 border-gray-500/30',     dot: 'bg-gray-400' },
};

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  low:    { label: 'منخفضة', color: 'text-gray-400' },
  normal: { label: 'عادية',  color: 'text-blue-400' },
  high:   { label: 'عالية',  color: 'text-orange-400' },
  urgent: { label: 'عاجل',   color: 'text-red-400' },
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function StorePublicPage() {
  const { id: storeId } = useParams<{ id: string }>();

  const [store, setStore]       = useState<StoreInfo | null>(null);
  const [requests, setRequests] = useState<CreativeRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'designs'>('requests');

  // form
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: string } | null>(null);
  const [form, setForm] = useState({
    title: '', request_type: 'design', priority: 'normal', platform: '', description: '',
  });

  const fetchData = async () => {
    try {
      const res  = await fetch(`/api/public/store/${storeId}`);
      const data = await res.json();
      if (!res.ok) return;
      setStore(data.store);
      setRequests(data.requests ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const res  = await fetch(`/api/public/store/${storeId}/requests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted({ id: data.request.id });
        setShowForm(false);
        setForm({ title: '', request_type: 'design', priority: 'normal', platform: '', description: '' });
        await fetchData();
      }
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  const handleFeedback = async (reqId: string, feedback: 'approved' | 'revision_requested', note?: string) => {
    await fetch(`/api/public/store/${storeId}/requests/${reqId}/feedback`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback, note }),
    });
    await fetchData();
  };

  // تصميم المتاجر التي لها result_files
  const designs = requests.filter(r => r.result_files && r.result_files.length > 0);
  const pendingReview = requests.filter(r => r.status === 'review');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-[#0a0118] flex items-center justify-center text-purple-300">
        المتجر غير موجود
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0118] text-white" dir="rtl">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-fuchsia-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 pb-24 space-y-6">

        {/* Header */}
        <div className="text-center pt-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {store.store_name || store.store_url}
          </h1>
          <p className="text-purple-300/60 text-sm mt-1">{store.store_url}</p>
        </div>

        {/* Success banner */}
        {submitted && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-2xl">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-green-400 font-medium text-sm">تم استلام طلبك بنجاح</p>
              <p className="text-green-300/60 text-xs mt-0.5">تم إنشاء مهمة تلقائياً للفريق</p>
            </div>
            <button onClick={() => setSubmitted(null)} className="text-green-400/50 hover:text-green-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-purple-500/20">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'requests'
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg'
                : 'text-purple-300/70 hover:text-white'
            }`}
          >
            الطلبات
            {requests.length > 0 && (
              <span className="mr-1.5 text-xs opacity-70">({requests.length})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('designs')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
              activeTab === 'designs'
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg'
                : 'text-purple-300/70 hover:text-white'
            }`}
          >
            التصاميم
            {pendingReview.length > 0 && (
              <span className="absolute -top-1 -left-1 w-4 h-4 bg-orange-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                {pendingReview.length}
              </span>
            )}
            {designs.length > 0 && (
              <span className="mr-1.5 text-xs opacity-70">({designs.length})</span>
            )}
          </button>
        </div>

        {/* ── Tab: الطلبات ── */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <button
              onClick={() => { setShowForm(true); setSubmitted(null); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-2xl font-medium hover:from-purple-500 hover:to-fuchsia-500 transition-all shadow-lg shadow-purple-500/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              طلب جديد
            </button>

            {requests.length === 0 ? (
              <div className="text-center py-16 text-purple-300/40">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2.414a2 2 0 01.586-1.414z" />
                </svg>
                <p className="text-sm">لا توجد طلبات بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(req => (
                  <RequestCard key={req.id} req={req} onFeedback={handleFeedback} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: التصاميم ── */}
        {activeTab === 'designs' && (
          <div className="space-y-4">
            {/* بانتظار المراجعة */}
            {pendingReview.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-orange-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  بانتظار مراجعتك ({pendingReview.length})
                </h3>
                {pendingReview.map(req => (
                  <DesignCard key={req.id} req={req} onFeedback={handleFeedback} highlight />
                ))}
              </div>
            )}

            {/* تصاميم مكتملة */}
            {designs.filter(r => r.status !== 'review').length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-purple-300/60">التصاميم المنجزة</h3>
                {designs.filter(r => r.status !== 'review').map(req => (
                  <DesignCard key={req.id} req={req} onFeedback={handleFeedback} />
                ))}
              </div>
            )}

            {designs.length === 0 && pendingReview.length === 0 && (
              <div className="text-center py-16 text-purple-300/40">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">لا توجد تصاميم بعد</p>
                <p className="text-xs mt-1 text-purple-300/30">ستظهر هنا عند إرسال الفريق للتصاميم</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── New Request Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowForm(false)}>
          <div
            className="bg-[#130825] border border-purple-500/30 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-purple-500/20">
              <h2 className="text-lg font-bold text-white">طلب جديد</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-purple-400 hover:bg-purple-500/10 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-purple-300/60 mb-1.5">
                  عنوان الطلب <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="مثال: بانر رمضان للسناب شات"
                  className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-xl text-white placeholder:text-purple-400/30 focus:outline-none focus:border-purple-400 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-purple-300/60 mb-1.5">نوع الطلب</label>
                  <select
                    value={form.request_type}
                    onChange={e => setForm(p => ({ ...p, request_type: e.target.value }))}
                    className="w-full px-3 py-3 bg-white/5 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-400 text-sm"
                  >
                    <option value="design">🎨 تصميم</option>
                    <option value="video">🎬 فيديو</option>
                    <option value="photo">📷 صورة</option>
                    <option value="copy">✍️ محتوى</option>
                    <option value="other">📦 أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-purple-300/60 mb-1.5">الأولوية</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full px-3 py-3 bg-white/5 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-400 text-sm"
                  >
                    <option value="low">منخفضة</option>
                    <option value="normal">عادية</option>
                    <option value="high">عالية</option>
                    <option value="urgent">🔴 عاجل</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-purple-300/60 mb-1.5">المنصة (اختياري)</label>
                <input
                  value={form.platform}
                  onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}
                  placeholder="سناب، تيك توك، إنستغرام..."
                  className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-xl text-white placeholder:text-purple-400/30 focus:outline-none focus:border-purple-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-purple-300/60 mb-1.5">تفاصيل الطلب</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="الألوان، المقاسات، الأفكار، أي تفاصيل مهمة..."
                  className="w-full px-4 py-3 bg-white/5 border border-purple-500/20 rounded-xl text-white placeholder:text-purple-400/30 focus:outline-none focus:border-purple-400 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !form.title.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-xl font-medium hover:from-purple-500 hover:to-fuchsia-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>جاري الإرسال...</>
                ) : 'إرسال الطلب'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RequestCard ───────────────────────────────────────────────────────────────
function RequestCard({
  req, onFeedback,
}: {
  req: CreativeRequest;
  onFeedback: (id: string, f: 'approved' | 'revision_requested', note?: string) => Promise<void>;
}) {
  const status   = STATUS_META[req.status]   ?? { label: req.status,   color: 'bg-gray-500/15 text-gray-400 border-gray-500/30', dot: 'bg-gray-400' };
  const priority = PRIORITY_META[req.priority] ?? { label: req.priority, color: 'text-gray-400' };

  return (
    <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-4 space-y-3 hover:border-purple-400/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-md">
              {TYPE_LABELS[req.request_type] ?? req.request_type}
            </span>
            {req.platform && <span className="text-xs text-purple-300/40">{req.platform}</span>}
          </div>
          <p className="text-white font-medium truncate">{req.title}</p>
          {req.description && (
            <p className="text-purple-300/50 text-xs mt-1 line-clamp-2">{req.description}</p>
          )}
        </div>
        <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-purple-300/40">
        <span className={priority.color}>{priority.label}</span>
        <span>{new Date(req.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}</span>
      </div>

      {/* زر اعتماد / تعديل — إذا الطلب جاهز للمراجعة */}
      {req.status === 'review' && !req.client_feedback && (
        <FeedbackButtons reqId={req.id} onFeedback={onFeedback} />
      )}

      {/* حالة الـ feedback */}
      {req.client_feedback && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl ${
          req.client_feedback === 'approved'
            ? 'bg-green-500/10 text-green-400'
            : 'bg-orange-500/10 text-orange-400'
        }`}>
          {req.client_feedback === 'approved' ? (
            <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>تم الاعتماد</>
          ) : (
            <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>طلبت تعديلاً</>
          )}
          {req.client_feedback_note && <span className="text-current/60 mr-1">— {req.client_feedback_note}</span>}
        </div>
      )}
    </div>
  );
}

// ─── DesignCard ────────────────────────────────────────────────────────────────
function DesignCard({
  req, onFeedback, highlight = false,
}: {
  req: CreativeRequest;
  onFeedback: (id: string, f: 'approved' | 'revision_requested', note?: string) => Promise<void>;
  highlight?: boolean;
}) {
  return (
    <div className={`border rounded-2xl p-4 space-y-3 transition-colors ${
      highlight
        ? 'bg-orange-500/5 border-orange-500/30 hover:border-orange-400/50'
        : 'bg-white/5 border-purple-500/20 hover:border-purple-400/40'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-md">
              {TYPE_LABELS[req.request_type] ?? req.request_type}
            </span>
            {highlight && (
              <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full animate-pulse">
                بانتظار مراجعتك
              </span>
            )}
          </div>
          <p className="text-white font-medium">{req.title}</p>
        </div>
        {req.client_feedback === 'approved' && (
          <span className="flex-shrink-0 text-xs bg-green-500/15 text-green-400 border border-green-500/30 px-2.5 py-1 rounded-full">
            معتمد ✓
          </span>
        )}
      </div>

      {/* ملفات التصميم */}
      {req.result_files && req.result_files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-purple-300/50">الملفات المرسلة:</p>
          <div className="space-y-1.5">
            {req.result_files.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2.5 bg-white/5 hover:bg-white/10 border border-purple-500/20 rounded-xl text-sm text-purple-300 hover:text-white transition-colors group"
              >
                <svg className="w-4 h-4 text-fuchsia-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="flex-1 truncate text-xs" dir="ltr">{url.split('/').pop() || `ملف ${i + 1}`}</span>
                <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* أزرار الاعتماد */}
      {req.status === 'review' && !req.client_feedback && (
        <FeedbackButtons reqId={req.id} onFeedback={onFeedback} />
      )}

      {req.client_feedback && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-xl ${
          req.client_feedback === 'approved'
            ? 'bg-green-500/10 text-green-400'
            : 'bg-orange-500/10 text-orange-400'
        }`}>
          {req.client_feedback === 'approved' ? '✓ تم الاعتماد' : '↺ طلبت تعديلاً'}
          {req.client_feedback_note && <span className="opacity-60 mr-1">— {req.client_feedback_note}</span>}
        </div>
      )}
    </div>
  );
}

// ─── FeedbackButtons ───────────────────────────────────────────────────────────
function FeedbackButtons({
  reqId, onFeedback,
}: {
  reqId: string;
  onFeedback: (id: string, f: 'approved' | 'revision_requested', note?: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote]       = useState('');

  const handleApprove = async () => {
    setLoading(true);
    await onFeedback(reqId, 'approved');
    setLoading(false);
  };

  const handleRevision = async () => {
    if (!note.trim()) { setShowNote(true); return; }
    setLoading(true);
    await onFeedback(reqId, 'revision_requested', note);
    setLoading(false);
    setShowNote(false);
    setNote('');
  };

  return (
    <div className="space-y-2 pt-1 border-t border-purple-500/20">
      {showNote && (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="اكتب ملاحظات التعديل المطلوبة..."
            autoFocus
            className="w-full px-3 py-2 bg-white/5 border border-orange-500/30 rounded-xl text-white text-sm placeholder:text-purple-400/40 focus:outline-none focus:border-orange-400 resize-none"
          />
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex-1 py-2.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          اعتماد
        </button>
        <button
          onClick={handleRevision}
          disabled={loading}
          className="flex-1 py-2.5 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/30 text-orange-400 rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {showNote ? 'إرسال الملاحظة' : 'طلب تعديل'}
        </button>
      </div>
    </div>
  );
}
