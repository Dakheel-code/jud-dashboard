'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CreativeRequest {
  id: string;
  title: string;
  request_type: string;
  status: string;
  priority: string;
  description?: string;
  platform?: string;
  created_at: string;
  task?: { id: string; status: string; title: string } | null;
}

const TYPE_LABELS: Record<string, string> = {
  design: 'تصميم',
  video:  'فيديو',
  photo:  'صورة',
  copy:   'محتوى',
  other:  'أخرى',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new:          { label: 'جديد',             color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  waiting_info: { label: 'بانتظار معلومات',  color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  in_progress:  { label: 'قيد التنفيذ',      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  review:       { label: 'مراجعة',           color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  done:         { label: 'مكتمل',            color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  rejected:     { label: 'مرفوض',            color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  canceled:     { label: 'ملغي',             color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low:    { label: 'منخفضة', color: 'text-gray-400' },
  normal: { label: 'عادية',  color: 'text-blue-400' },
  high:   { label: 'عالية',  color: 'text-orange-400' },
  urgent: { label: 'عاجل',   color: 'text-red-400' },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function StoreRequestsPage() {
  const { id: storeId } = useParams<{ id: string }>();

  const [requests, setRequests]   = useState<CreativeRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title:        '',
    request_type: 'design',
    priority:     'normal',
    description:  '',
    platform:     '',
  });

  // ── جلب الطلبات ──────────────────────────────────────────────────────────
  const fetchRequests = async () => {
    try {
      const res  = await fetch(`/api/creative-requests?store_id=${storeId}`);
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, [storeId]);

  // ── إرسال الطلب ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      const res  = await fetch('/api/creative-requests', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ store_id: storeId, ...form }),
      });
      const data = await res.json();
      if (res.ok && data.request) {
        setSubmittedId(data.request.id);
        setLinkedTaskId(data.task?.id ?? null);
        setShowForm(false);
        setForm({ title: '', request_type: 'design', priority: 'normal', description: '', platform: '' });
        await fetchRequests();
      }
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0520] via-[#120830] to-[#0d0520] p-4 md:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">طلبات التصميم والمحتوى</h1>
            <p className="text-purple-300/60 text-sm mt-1">أرسل طلباتك وتابع حالتها</p>
          </div>
          <button
            onClick={() => { setShowForm(true); setSubmittedId(null); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-fuchsia-500 transition-all text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            طلب جديد
          </button>
        </div>

        {/* 4.2 — Badge: "تم إنشاء مهمة تلقائياً" */}
        {submittedId && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-green-400 font-medium text-sm">تم استلام طلبك بنجاح</p>
              <p className="text-green-300/70 text-xs mt-0.5">
                تم إنشاء مهمة تلقائياً للمسؤول
                {linkedTaskId && (
                  <span className="mr-1 text-green-300/50">
                    {'· '}رقم المهمة: <span className="font-mono">{linkedTaskId.slice(0, 8)}</span>
                  </span>
                )}
              </p>
            </div>
            <button onClick={() => setSubmittedId(null)} className="text-green-400/50 hover:text-green-400 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="bg-[#1a0a2e] border border-purple-500/30 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-purple-500/20">
                <h2 className="text-lg font-bold text-white">طلب جديد</h2>
                <button onClick={() => setShowForm(false)} className="text-purple-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">

                {/* العنوان */}
                <div>
                  <label className="block text-xs text-purple-300/70 mb-1.5">عنوان الطلب <span className="text-red-400">*</span></label>
                  <input
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="مثال: بانر رمضان للسناب"
                    className="w-full px-3 py-2.5 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white text-sm placeholder:text-purple-400/40 focus:outline-none focus:border-purple-400"
                    required
                  />
                </div>

                {/* نوع الطلب + الأولوية */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-purple-300/70 mb-1.5">نوع الطلب</label>
                    <select
                      value={form.request_type}
                      onChange={e => setForm(p => ({ ...p, request_type: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white text-sm focus:outline-none focus:border-purple-400"
                    >
                      <option value="design">تصميم</option>
                      <option value="video">فيديو</option>
                      <option value="photo">صورة</option>
                      <option value="copy">محتوى</option>
                      <option value="other">أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-purple-300/70 mb-1.5">الأولوية</label>
                    <select
                      value={form.priority}
                      onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white text-sm focus:outline-none focus:border-purple-400"
                    >
                      <option value="low">منخفضة</option>
                      <option value="normal">عادية</option>
                      <option value="high">عالية</option>
                      <option value="urgent">عاجل</option>
                    </select>
                  </div>
                </div>

                {/* المنصة */}
                <div>
                  <label className="block text-xs text-purple-300/70 mb-1.5">المنصة (اختياري)</label>
                  <input
                    value={form.platform}
                    onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}
                    placeholder="مثال: سناب، تيك توك، إنستغرام"
                    className="w-full px-3 py-2.5 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white text-sm placeholder:text-purple-400/40 focus:outline-none focus:border-purple-400"
                  />
                </div>

                {/* الوصف */}
                <div>
                  <label className="block text-xs text-purple-300/70 mb-1.5">تفاصيل الطلب</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    rows={3}
                    placeholder="اكتب تفاصيل الطلب، الألوان، المقاسات، أي ملاحظات..."
                    className="w-full px-3 py-2.5 bg-purple-900/30 border border-purple-500/20 rounded-xl text-white text-sm placeholder:text-purple-400/40 focus:outline-none focus:border-purple-400 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !form.title.trim()}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-fuchsia-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      جاري الإرسال...
                    </>
                  ) : (
                    'إرسال الطلب'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* قائمة الطلبات */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="w-8 h-8 animate-spin text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-purple-300/50">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2.414a2 2 0 01.586-1.414z" />
            </svg>
            <p className="text-sm">لا توجد طلبات بعد</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-purple-400 hover:text-purple-300 text-sm underline"
            >
              أنشئ أول طلب
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <RequestCard key={req.id} req={req} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RequestCard ──────────────────────────────────────────────────────────────
function RequestCard({ req }: { req: CreativeRequest }) {
  const status   = STATUS_LABELS[req.status]   ?? { label: req.status,   color: 'bg-gray-500/20 text-gray-400' };
  const priority = PRIORITY_LABELS[req.priority] ?? { label: req.priority, color: 'text-gray-400' };

  return (
    <div className="bg-white/5 border border-purple-500/20 rounded-xl p-4 space-y-3 hover:border-purple-500/40 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md">
              {TYPE_LABELS[req.request_type] ?? req.request_type}
            </span>
            {req.platform && (
              <span className="text-xs text-purple-300/50">{req.platform}</span>
            )}
          </div>
          <h3 className="text-white font-medium mt-1 truncate">{req.title}</h3>
          {req.description && (
            <p className="text-purple-300/60 text-xs mt-1 line-clamp-2">{req.description}</p>
          )}
        </div>
        <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-purple-300/50">
        <div className="flex items-center gap-3">
          <span className={priority.color}>{priority.label}</span>
          <span>{new Date(req.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}</span>
        </div>

        {/* 4.2 — Badge مهمة مرتبطة */}
        {req.task ? (
          <span className="flex items-center gap-1 text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            تم إنشاء مهمة تلقائياً للمسؤول
          </span>
        ) : (
          <span className="flex items-center gap-1 text-purple-300/40 bg-purple-500/5 px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            قيد المعالجة
          </span>
        )}
      </div>
    </div>
  );
}
