'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

// ─── Lightbox ───────────────────────────────────────────────────────────────
function Lightbox({ urls, startIndex, onClose }: { urls: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const url = urls[idx];
  const isImg = /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(url) || url.includes('supabase') && !url.match(/\.(pdf|zip|rar|docx?|xlsx?)$/i);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(i => Math.max(0, i - 1));
      if (e.key === 'ArrowLeft')  setIdx(i => Math.min(urls.length - 1, i + 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [urls.length, onClose]);

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
        {/* Close */}
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/70 hover:text-white">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        {isImg ? (
          <img src={url} alt="" className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl" />
        ) : (
          <div className="bg-[#130825] border border-purple-500/30 rounded-2xl p-8 text-center">
            <svg className="w-16 h-16 text-purple-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="text-white font-medium mb-4">{url.split('/').pop()?.split('?')[0] || 'ملف'}</p>
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors">
              فتح / تحميل
            </a>
          </div>
        )}

        {/* Arrows */}
        {urls.length > 1 && (
          <div className="flex items-center gap-6 mt-4">
            <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="text-white/50 text-sm">{idx + 1} / {urls.length}</span>
            <button onClick={() => setIdx(i => Math.min(urls.length - 1, i + 1))} disabled={idx === urls.length - 1}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FileThumb ────────────────────────────────────────────────────────────
function FileThumb({ urls, size = 'md' }: { urls: string[]; size?: 'sm' | 'md' }) {
  const [lb, setLb] = useState<number | null>(null);
  const dim = size === 'sm' ? 'w-14 h-14' : 'w-16 h-16';

  const isImg = (u: string) => /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(u) ||
    (u.includes('supabase') && !u.match(/\.(pdf|zip|rar|docx?|xlsx?|mp4|mov)$/i));

  const ext = (u: string) => u.split('.').pop()?.split('?')[0]?.toUpperCase().slice(0,4) ?? 'FILE';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {urls.map((u, i) => (
          <button key={i} onClick={() => setLb(i)}
            className={`${dim} rounded-xl overflow-hidden border-2 border-purple-500/30 hover:border-purple-400 transition-all flex-shrink-0 relative group`}>
            {isImg(u) ? (
              <img src={u} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-purple-500/10 flex flex-col items-center justify-center gap-1">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-[9px] text-purple-300/70 font-bold">{ext(u)}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </button>
        ))}
      </div>
      {lb !== null && <Lightbox urls={urls} startIndex={lb} onClose={() => setLb(null)} />}
    </>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface StoreInfo {
  id: string;
  store_name: string | null;
  store_url: string;
  status: string;
}

interface TaskItem {
  id: string;
  title: string;
  category: string;
  order_index: number;
  is_required?: boolean;
  is_done: boolean;
}


interface BrandIdentity {
  id?: string;
  store_id: string;
  logo_urls: string[];
  guideline_urls: string[];
  brand_colors: string | null;
  fonts: string | null;
  notes: string | null;
  updated_at?: string;
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

interface Comment {
  id: string;
  request_id: string;
  body: string | null;
  author_name: string;
  author_role: 'client' | 'designer' | 'admin';
  file_urls: string[];
  created_at: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  design: 'تصميم', video: 'فيديو', photo: 'صورة', copy: 'محتوى', other: 'أخرى',
};

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  new:          { label: 'جديد',            color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',      dot: 'bg-blue-400' },
  waiting_info: { label: 'بانتظار معلومات', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' },
  in_progress:  { label: 'قيد التنفيذ',     color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' },
  review:       { label: 'جاهز للمراجعة',   color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
  done:         { label: 'معتمد',           color: 'bg-green-500/15 text-green-400 border-green-500/30',   dot: 'bg-green-400' },
  rejected:     { label: 'مرفوض',           color: 'bg-red-500/15 text-red-400 border-red-500/30',         dot: 'bg-red-400' },
  canceled:     { label: 'ملغي',            color: 'bg-gray-500/15 text-gray-400 border-gray-500/30',      dot: 'bg-gray-400' },
};

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  low: { label: 'منخفضة', color: 'text-gray-400' },
  normal: { label: 'عادية', color: 'text-blue-400' },
  high: { label: 'عالية', color: 'text-orange-400' },
  urgent: { label: 'عاجل', color: 'text-red-400' },
};


// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StorePublicPage() {
  const { id: storeId } = useParams<{ id: string }>();

  const [store, setStore]                     = useState<StoreInfo | null>(null);
  const [requests, setRequests]               = useState<CreativeRequest[]>([]);
  const [tasksByCategory, setTasksByCategory] = useState<Record<string, TaskItem[]>>({});
  const [tasksStats, setTasksStats]           = useState<{ total: number; completed: number; percentage: number } | null>(null);
  const [collapsedCats, setCollapsedCats]     = useState<Set<string>>(new Set());
  const [loading, setLoading]                 = useState(true);
  const [brandIdentity, setBrandIdentity]     = useState<BrandIdentity | null>(null);
  const [showBrandModal, setShowBrandModal]   = useState(false);
  const [showForm, setShowForm]               = useState(false);
  const [submitting, setSubmitting]           = useState(false);
  const [submitted, setSubmitted]             = useState<{ id: string } | null>(null);
  const [formStep, setFormStep] = useState(1);
  const [form, setForm] = useState({
    title: '', request_type: 'design', priority: 'normal', platform: '', description: '',
    campaign_goals: [] as string[],
    campaign_goals_other: '',
    has_offer: '',
    target_audience: '',
    content_tone: '',
    brand_colors: '',
    brand_fonts: '',
    discount_code: '',
    current_discounts: '',
    free_shipping: '',
    product_links: '',
    product_media_links: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch(`/api/public/store/${storeId}?t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) return;
      setStore(data.store);
      setRequests(data.requests ?? []);
      setTasksByCategory(data.tasks_by_category ?? {});
      setTasksStats(data.tasks_stats ?? null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [storeId]);

  const fetchBrandIdentity = useCallback(async () => {
    try {
      const res  = await fetch(`/api/public/store/${storeId}/brand-identity`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setBrandIdentity(data.identity);
    } catch { /* silent */ }
  }, [storeId]);

  // polling خفيف كل 10 ثوانٍ للطلبات فقط — يعكس تغييرات الإدارة بسرعة
  const fetchRequestsOnly = useCallback(async () => {
    try {
      const res  = await fetch(`/api/public/store/${storeId}/requests-only?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch { /* silent */ }
  }, [storeId]);

  // polling الكامل كل 30 ثانية (متجر + مهام + طلبات)
  useEffect(() => {
    fetchData();
    fetchBrandIdentity();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') fetchData();
    }, 30_000);
    return () => clearInterval(t);
  }, [fetchData, fetchBrandIdentity]);

  // polling خفيف كل 10 ثوانٍ للطلبات فقط
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') fetchRequestsOnly();
    }, 10_000);
    return () => clearInterval(t);
  }, [fetchRequestsOnly]);

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
        setFormStep(1);
        setForm({ title: '', request_type: 'design', priority: 'normal', platform: '', description: '', campaign_goals: [], campaign_goals_other: '', has_offer: '', target_audience: '', content_tone: '', brand_colors: '', brand_fonts: '', discount_code: '', current_discounts: '', free_shipping: '', product_links: '', product_media_links: '' });
        await fetchData();
      }
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  const handleFeedback = async (reqId: string, feedback: 'approved' | 'revision_requested', note?: string) => {
    // 1. Optimistic update — تحديث فوري في الـ UI
    const newStatus = feedback === 'approved' ? 'done' : 'in_progress';
    setRequests(prev => prev.map(r =>
      r.id === reqId
        ? { ...r, status: newStatus, client_feedback: feedback, client_feedback_note: note ?? null }
        : r
    ));
    try {
      const res = await fetch(`/api/public/store/${storeId}/requests/${reqId}/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback, note }),
      });
      if (res.ok) {
        // 2. بعد نجاح السيرفير — حدّث من الـ response مباشرة (أسرع من fetchData)
        const { request: updated } = await res.json();
        if (updated) {
          setRequests(prev => prev.map(r => r.id === reqId ? { ...r, ...updated } : r));
        }
      } else {
        // 3. عند فشل — أعد البيانات الأصلية
        await fetchData();
      }
    } catch {
      await fetchData();
    }
  };

  const toggleCat = (cat: string) =>
    setCollapsedCats(prev => {
      const n = new Set(prev);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });

  const DESIGN_TYPES = ['design', 'video', 'photo', 'copy', 'other'];
  // قسم التصاميم: فقط طلبات التصميم ذات review أو done (review=جاهز, done=معتمد)
  const DESIGN_STATUSES = ['review', 'done'];
  const pendingReview   = requests.filter(r => DESIGN_TYPES.includes(r.request_type) && r.status === 'review');
  const approvedDesigns = requests.filter(r => DESIGN_TYPES.includes(r.request_type) && r.status === 'done');
  const designs         = [...pendingReview, ...approvedDesigns];
  // قسم الطلبات: كل ما ليس في قسم التصاميم (new, in_progress, waiting_info ... + أي طلب غير تصميمي)
  const nonDesignRequests = requests.filter(r =>
    !DESIGN_TYPES.includes(r.request_type) ||
    !DESIGN_STATUSES.includes(r.status)
  );
  const revisionDesigns: typeof requests = []; // لم تعد تستخدم بعد هذا التعديل
  const otherDesigns:    typeof requests = [];

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
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-fuchsia-600/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 pb-24 space-y-5">

        {/* ── Header ── */}
        <div className="text-center pt-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">{store.store_name || store.store_url}</h1>
          <p className="text-purple-300/60 text-sm mt-1">{store.store_url}</p>
        </div>

        {/* ── Success banner ── */}
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

        {/* ══ قسم الطلبات ══ */}
        <section className="bg-purple-950/40 rounded-2xl border border-purple-500/20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/15">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-fuchsia-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2.414a2 2 0 01.586-1.414z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">الطلبات</h2>
                {nonDesignRequests.length > 0 && (
                  <p className="text-[10px] text-purple-300/50">{nonDesignRequests.length} طلب</p>
                )}
              </div>
            </div>
            <button
              onClick={() => { setShowForm(true); setSubmitted(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-xl text-xs font-medium hover:from-purple-500 hover:to-fuchsia-500 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              طلب جديد
            </button>
          </div>
          <div className="p-4">
            {nonDesignRequests.length === 0 ? (
              <div className="text-center py-8 text-purple-300/40">
                <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2.414a2 2 0 01.586-1.414z" />
                </svg>
                <p className="text-sm">لا توجد طلبات بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {nonDesignRequests.map(req => <RequestCard key={req.id} req={req} storeId={storeId} onFeedback={handleFeedback} onRefresh={fetchData} />)}
              </div>
            )}
          </div>
        </section>

        {/* ══ قسم التصاميم ══ */}
        <section className="bg-purple-950/40 rounded-2xl border border-purple-500/20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/15">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">التصاميم</h2>
                {pendingReview.length > 0 && (
                  <p className="text-[10px] text-orange-400 animate-pulse">{pendingReview.length} بانتظار مراجعتك</p>
                )}
              </div>
            </div>
          </div>
          <div className="p-4 space-y-4">

            {/* — بانتظار مراجعتك — */}
            {pendingReview.length > 0 && (
              <div className="space-y-3">
                {pendingReview.map(req => <DesignCard key={req.id} req={req} onFeedback={handleFeedback} highlight />)}
              </div>
            )}

            {/* — تحت التعديل — */}
            {revisionDesigns.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-orange-300/60 font-medium px-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                  تحت التعديل
                </p>
                {revisionDesigns.map(req => <DesignCard key={req.id} req={req} onFeedback={handleFeedback} />)}
              </div>
            )}

            {/* — معتمدة — */}
            {approvedDesigns.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-green-400/70 font-medium px-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  معتمدة
                </p>
                {approvedDesigns.map(req => <DesignCard key={req.id} req={req} onFeedback={handleFeedback} />)}
              </div>
            )}

            {/* — أخرى (canceled, waiting_info...) — */}
            {otherDesigns.length > 0 && (
              <div className="space-y-2">
                {otherDesigns.map(req => <DesignCard key={req.id} req={req} onFeedback={handleFeedback} />)}
              </div>
            )}

            {designs.length === 0 && pendingReview.length === 0 && (
              <div className="text-center py-8 text-purple-300/40">
                <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">لا توجد تصاميم بعد</p>
              </div>
            )}
          </div>
        </section>

        {/* ══ قسم هوية المتجر ══ */}
        <section className="bg-purple-950/40 rounded-2xl border border-purple-500/20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/15">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-white">هوية المتجر</h2>
            </div>
            <button
              onClick={() => setShowBrandModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-xs font-medium text-indigo-300 hover:bg-indigo-600/30 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {brandIdentity ? 'تعديل' : 'إضافة'}
            </button>
          </div>

          <div className="p-4 space-y-5">
            {!brandIdentity ? (
              <div className="text-center py-8 text-purple-300/40">
                <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <p className="text-sm">لم تُضف هوية المتجر بعد</p>
                <button onClick={() => setShowBrandModal(true)} className="mt-3 text-xs text-indigo-400 underline underline-offset-2">إضافة الآن</button>
              </div>
            ) : (
              <>
                {/* الشعار */}
                {brandIdentity.logo_urls?.length > 0 && (
                  <div>
                    <p className="text-xs text-indigo-300/60 mb-2 font-medium">الشعار</p>
                    <div className="flex flex-wrap gap-2">
                      {brandIdentity.logo_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="w-20 h-20 rounded-xl border border-purple-500/20 bg-white/5 flex items-center justify-center overflow-hidden hover:border-indigo-400/50 transition-all">
                          {/\.(jpe?g|png|gif|webp|svg)$/i.test(url) ? (
                            <img src={url} alt="logo" className="w-full h-full object-contain p-1" />
                          ) : (
                            <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* الألوان */}
                {brandIdentity.brand_colors && (
                  <div>
                    <p className="text-xs text-indigo-300/60 mb-2 font-medium">ألوان البراند</p>
                    <div className="flex flex-wrap gap-2">
                      {brandIdentity.brand_colors.split(/[\n,،]+/).map((c, i) => {
                        const hex = c.trim().match(/#[0-9a-fA-F]{3,6}/)?.[0];
                        return (
                          <div key={i} className="flex items-center gap-2 bg-white/5 border border-purple-500/20 rounded-xl px-3 py-1.5">
                            {hex && <span className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" style={{ background: hex }} />}
                            <span className="text-xs text-white/80 font-mono">{c.trim()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* الخطوط */}
                {brandIdentity.fonts && (
                  <div>
                    <p className="text-xs text-indigo-300/60 mb-2 font-medium">الخطوط</p>
                    <div className="bg-white/5 border border-purple-500/20 rounded-xl px-4 py-3">
                      <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{brandIdentity.fonts}</p>
                    </div>
                  </div>
                )}

                {/* دليل الهوية */}
                {brandIdentity.guideline_urls?.length > 0 && (
                  <div>
                    <p className="text-xs text-indigo-300/60 mb-2 font-medium">دليل الهوية (Brand Guidelines)</p>
                    <div className="space-y-2">
                      {brandIdentity.guideline_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 bg-white/5 border border-purple-500/20 rounded-xl px-4 py-2.5 hover:border-indigo-400/50 transition-all">
                          <svg className="w-5 h-5 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-xs text-indigo-300 truncate">{url.split('/').pop() ?? `ملف ${i + 1}`}</span>
                          <svg className="w-4 h-4 text-purple-400/50 mr-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* ملاحظات إضافية */}
                {brandIdentity.notes && (
                  <div>
                    <p className="text-xs text-indigo-300/60 mb-2 font-medium">ملاحظات إضافية</p>
                    <div className="bg-white/5 border border-purple-500/20 rounded-xl px-4 py-3">
                      <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{brandIdentity.notes}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* ══ قسم المهام ══ */}
        <section className="bg-purple-950/40 rounded-2xl border border-purple-500/20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/15">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">قائمة المهام</h2>
                {tasksStats && <p className="text-[10px] text-purple-300/50">({tasksStats.completed}/{tasksStats.total})</p>}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>

          {tasksStats && (
            <div className="px-4 py-2.5 border-b border-purple-500/10">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-purple-300/50">التقدم الكلي</span>
                <span className="text-xs font-bold text-white">{tasksStats.percentage}%</span>
              </div>
              <div className="h-1.5 bg-purple-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all" style={{ width: `${tasksStats.percentage}%` }} />
              </div>
            </div>
          )}

          {Object.keys(tasksByCategory).length === 0 ? (
            <div className="text-center py-10 text-purple-300/40">
              <p className="text-sm">لا توجد مهام</p>
            </div>
          ) : (
            <div className="divide-y divide-purple-500/10">
              {Object.entries(tasksByCategory).map(([cat, catTasks]) => {
                const done  = (catTasks as TaskItem[]).filter(t => t.is_done).length;
                const total = (catTasks as TaskItem[]).length;
                const open  = !collapsedCats.has(cat);
                return (
                  <div key={cat}>
                    <button
                      onClick={() => toggleCat(cat)}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-purple-500/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <svg className={`w-4 h-4 text-purple-400 transition-transform ${open ? '' : '-rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        <span className="text-sm font-medium text-purple-300/70">{done}/{total}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{cat}</span>
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                      </div>
                    </button>
                    {open && (
                      <div className="px-4 pb-3 space-y-1">
                        {(catTasks as TaskItem[]).map(task => (
                          <div key={task.id} className="flex items-center gap-3 py-2 border-b border-purple-500/5 last:border-0">
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${task.is_done ? 'bg-purple-500 border-purple-500' : 'border-purple-500/40'}`}>
                              {task.is_done && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className={`text-sm flex-1 ${task.is_done ? 'line-through text-white/30' : 'text-white/80'}`}>{task.title}</span>
                            {task.is_required && !task.is_done && (
                              <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">مطلوب</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>


      </div>

      {/* ── Modal: هوية المتجر ── */}
      {showBrandModal && (
        <BrandIdentityModal
          storeId={storeId}
          current={brandIdentity}
          onClose={() => setShowBrandModal(false)}
          onSave={(identity) => { setBrandIdentity(identity); setShowBrandModal(false); }}
        />
      )}

      {/* ── Modal: طلب جديد ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#130825] border border-purple-500/30 rounded-3xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-purple-500/20 flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white">طلب تصميم جديد</h2>
                <p className="text-xs text-purple-300/50 mt-0.5">الخطوة {formStep} من 2</p>
              </div>
              <button onClick={() => { setShowForm(false); setFormStep(1); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-purple-400 hover:bg-purple-500/10">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Progress */}
            <div className="flex gap-1.5 px-5 pt-3 flex-shrink-0">
              {[1,2].map(s => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= formStep ? 'bg-purple-500' : 'bg-purple-500/15'}`} />
              ))}
            </div>

            <div className="overflow-y-auto flex-1 p-5">

              {/* ── الخطوة 1: معلومات الطلب الأساسية ── */}
              {formStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-purple-300/70 mb-1.5">عنوان الطلب *</label>
                    <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="مثال: تصميم بنر إعلاني..."
                      className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-purple-300/70 mb-1.5">نوع الطلب</label>
                      <select value={form.request_type} onChange={e => setForm(f => ({ ...f, request_type: e.target.value }))}
                        className="w-full bg-[#1a0a2e] border border-purple-500/30 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400">
                        {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-purple-300/70 mb-1.5">الأولوية</label>
                      <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                        className="w-full bg-[#1a0a2e] border border-purple-500/30 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-400">
                        {Object.entries(PRIORITY_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-purple-300/70 mb-1.5">المنصة (اختياري)</label>
                    <input type="text" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                      placeholder="مثال: Snapchat، Meta..."
                      className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-400" />
                  </div>

                  {/* هدف الحملة */}
                  <div>
                    <label className="block text-xs text-purple-300/70 mb-2">هدف الحملة *</label>
                    <div className="space-y-2">
                      {['زيادة المبيعات','تصريف منتجات','إطلاق منتج جديد','زيادة الوعي بالعلامة التجارية'].map(g => (
                        <label key={g} className="flex items-center gap-3 cursor-pointer">
                          <div onClick={() => setForm(f => ({ ...f, campaign_goals: f.campaign_goals.includes(g) ? f.campaign_goals.filter(x => x !== g) : [...f.campaign_goals, g] }))}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              form.campaign_goals.includes(g) ? 'bg-purple-500 border-purple-500' : 'border-purple-500/40'
                            }`}>
                            {form.campaign_goals.includes(g) && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            )}
                          </div>
                          <span className="text-sm text-white/80">{g}</span>
                        </label>
                      ))}
                      <div className="flex items-center gap-3">
                        <div onClick={() => setForm(f => ({ ...f, campaign_goals: f.campaign_goals.includes('أخرى') ? f.campaign_goals.filter(x => x !== 'أخرى') : [...f.campaign_goals, 'أخرى'] }))}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${
                            form.campaign_goals.includes('أخرى') ? 'bg-purple-500 border-purple-500' : 'border-purple-500/40'
                          }`}>
                          {form.campaign_goals.includes('أخرى') && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          )}
                        </div>
                        <input type="text" placeholder="أخرى:" value={form.campaign_goals_other} onChange={e => setForm(f => ({ ...f, campaign_goals_other: e.target.value }))}
                          className="flex-1 bg-white/5 border border-purple-500/30 rounded-lg px-3 py-1.5 text-sm text-white placeholder-purple-300/30 focus:outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* الجمهور المستهدف */}
                  <div>
                    <label className="block text-xs text-purple-300/70 mb-1.5">الجمهور المستهدف * <span className="text-purple-300/40">(مثال: نساء – السعودية – 25-40 سنة)</span></label>
                    <input type="text" value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))}
                      placeholder="إجابتك..."
                      className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-400" />
                  </div>

                  {/* نبرة المحتوى */}
                  <div>
                    <label className="block text-xs text-purple-300/70 mb-2">نبرة المحتوى المفضلة *</label>
                    <div className="space-y-2">
                      {['رسمية','عامية','مرحة','حسب ما ترونه مناسب'].map(t => (
                        <label key={t} className="flex items-center gap-3 cursor-pointer" onClick={() => setForm(f => ({ ...f, content_tone: t }))}>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            form.content_tone === t ? 'border-purple-500' : 'border-purple-500/40'
                          }`}>
                            {form.content_tone === t && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
                          </div>
                          <span className="text-sm text-white/80">{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-purple-300/70 mb-1.5">تفاصيل إضافية</label>
                    <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="أي تفاصيل إضافية..." className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-400 resize-none" />
                  </div>
                </div>
              )}

              {/* ── الخطوة 2: العروض والخصومات ── */}
              {formStep === 2 && (
                <div className="space-y-4">

                  {/* هل يوجد عرض */}
                  <div>
                    <label className="block text-xs text-purple-300/70 mb-2">هل يوجد عرض/كود/خصوم؟ *</label>
                    <div className="space-y-2">
                      {['لا','نعم'].map(o => (
                        <label key={o} className="flex items-center gap-3 cursor-pointer" onClick={() => setForm(f => ({ ...f, has_offer: o }))}>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            form.has_offer === o ? 'border-purple-500' : 'border-purple-500/40'
                          }`}>
                            {form.has_offer === o && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
                          </div>
                          <span className="text-sm text-white/80">{o}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-purple-300/70 mb-1.5">هل يوجد كود خصم تريد إبرازه وكم نسبة خصمه؟</label>
                    <input type="text" value={form.discount_code} onChange={e => setForm(f => ({ ...f, discount_code: e.target.value }))}
                      placeholder="مثال: SAVE20 - خصم 20%..."
                      className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-400" />
                  </div>

                  <div>
                    <label className="block text-xs text-purple-300/70 mb-1.5">هل توجد خصومات حالية على المنتجات؟</label>
                    <input type="text" value={form.current_discounts} onChange={e => setForm(f => ({ ...f, current_discounts: e.target.value }))}
                      placeholder="إجابتك..."
                      className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-400" />
                  </div>

                  {/* التوصيل المجاني */}
                  <div>
                    <label className="block text-xs text-purple-300/70 mb-2">هل يوجد توصيل مجاني؟ *</label>
                    <div className="space-y-2">
                      {['نعم','لا','أخرى'].map(o => (
                        <label key={o} className="flex items-center gap-3 cursor-pointer" onClick={() => setForm(f => ({ ...f, free_shipping: o }))}>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            form.free_shipping === o ? 'border-purple-500' : 'border-purple-500/40'
                          }`}>
                            {form.free_shipping === o && <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />}
                          </div>
                          <span className="text-sm text-white/80">{o}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-purple-300/70 mb-1.5">روابط المنتجات للحملات الإعلانية * <span className="text-purple-300/40">(حد أقصى 5 منتجات)</span></label>
                    <textarea rows={3} value={form.product_links} onChange={e => setForm(f => ({ ...f, product_links: e.target.value }))}
                      placeholder="ضع روابط المنتجات هنا..."
                      className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-400 resize-none" />
                  </div>

                  <div>
                    <label className="block text-xs text-purple-300/70 mb-1.5">إرفاق صور/فيديوهات المنتجات * <span className="text-purple-300/40">(يفضل روابط درايف)</span></label>
                    <textarea rows={2} value={form.product_media_links} onChange={e => setForm(f => ({ ...f, product_media_links: e.target.value }))}
                      placeholder="روابط الصور أو الفيديوهات..."
                      className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-400 resize-none" />
                  </div>
                </div>
              )}

            </div>

            {/* Footer Buttons */}
            <div className="p-5 border-t border-purple-500/20 flex gap-3 flex-shrink-0">
              {formStep > 1 && (
                <button type="button" onClick={() => setFormStep(s => s - 1)}
                  className="flex-1 py-3 bg-white/5 border border-purple-500/30 rounded-xl font-medium text-purple-300 hover:bg-white/10 transition-all">
                  السابق
                </button>
              )}
              {formStep < 3 ? (
                <button type="button"
                  onClick={() => {
                    if (formStep === 1 && !form.title.trim()) return;
                    setFormStep(s => s + 1);
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-xl font-medium text-white hover:from-purple-500 hover:to-fuchsia-500 transition-all">
                  التالي
                </button>
              ) : (
                <button type="button" disabled={submitting} onClick={handleSubmit as any}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-xl font-medium text-white hover:from-purple-500 hover:to-fuchsia-500 transition-all disabled:opacity-60">
                  {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RequestCard ──────────────────────────────────────────────────────────────
function RequestCard({ req, storeId, onFeedback, onRefresh }: {
  req: CreativeRequest;
  storeId: string;
  onFeedback: (id: string, fb: 'approved' | 'revision_requested', note?: string) => void;
  onRefresh: () => void;
}) {
  const [showNote, setShowNote]         = useState(false);
  const [note, setNote]                 = useState('');
  const [open, setOpen]                 = useState(false);
  const [comments, setComments]         = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText]   = useState('');
  const [files, setFiles]               = useState<File[]>([]);
  const [sending, setSending]           = useState(false);
  const fileRef                         = useRef<HTMLInputElement>(null);
  const s  = STATUS_META[req.status] ?? STATUS_META.new;

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const res  = await fetch(`/api/public/store/${storeId}/requests/${req.id}/comments`);
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch { /* silent */ }
    finally { setCommentsLoading(false); }
  }, [storeId, req.id]);

  useEffect(() => { if (open) loadComments(); }, [open, loadComments]);

  const uploadFile = async (file: File): Promise<string | null> => {
    const form = new FormData();
    form.append('file', file);
    form.append('request_id', req.id);
    try {
      const res  = await fetch('/api/public/upload', { method: 'POST', body: form });
      const data = await res.json();
      return data.url ?? null;
    } catch { return null; }
  };

  const sendComment = async () => {
    if (!commentText.trim() && files.length === 0) return;
    setSending(true);
    try {
      // رفع الملفات بالتوازي
      const results = await Promise.all(files.map(f => uploadFile(f)));
      const uploadedUrls = results.filter(Boolean) as string[];
      await fetch(`/api/public/store/${storeId}/requests/${req.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentText, author_role: 'client', file_urls: uploadedUrls }),
      });
      setCommentText('');
      setFiles([]);
      await loadComments();
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  const fmt = (d: string) => new Date(d).toLocaleString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white/5 border border-purple-500/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <button onClick={() => setOpen(v => !v)} className="w-full p-4 text-right">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{req.title}</p>
            <p className="text-xs text-purple-300/50 mt-0.5">{TYPE_LABELS[req.request_type] ?? req.request_type}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium ${s.color}`}>{s.label}</span>
            <svg className={`w-4 h-4 text-purple-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-purple-500/15 px-4 pb-4 space-y-3">

          {/* ملفات النتيجة */}
          {req.result_files && req.result_files.length > 0 && (
            <div className="pt-3">
              <p className="text-xs text-purple-300/50 mb-2">الملفات المرفقة</p>
              <FileThumb urls={req.result_files} />
            </div>
          )}

          {/* أزرار الاعتماد */}
          {req.result_files && req.result_files.length > 0 && req.status === 'review' && !req.client_feedback && (
            <div className="space-y-2">
              <p className="text-xs text-orange-400">الملفات جاهزة للمراجعة</p>
              <div className="flex gap-2">
                <button onClick={() => { onFeedback(req.id, 'approved'); }}
                  className="flex-1 py-2 bg-green-500/15 border border-green-500/30 rounded-xl text-xs text-green-400 font-medium hover:bg-green-500/25 transition-colors">
                  ✓ اعتماد
                </button>
                <button onClick={() => setShowNote(v => !v)}
                  className="flex-1 py-2 bg-orange-500/15 border border-orange-500/30 rounded-xl text-xs text-orange-400 font-medium hover:bg-orange-500/25 transition-colors">
                  ✕ تعديل
                </button>
              </div>
              {showNote && (
                <div className="space-y-2">
                  <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                    placeholder="ملاحظات التعديل..."
                    className="w-full bg-white/5 border border-orange-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-purple-300/30 focus:outline-none resize-none" />
                  <button onClick={() => { onFeedback(req.id, 'revision_requested', note); setShowNote(false); }}
                    className="w-full py-2 bg-orange-500/20 border border-orange-500/40 rounded-xl text-xs text-orange-400 font-medium hover:bg-orange-500/30 transition-colors">
                    إرسال الملاحظات
                  </button>
                </div>
              )}
            </div>
          )}

          {/* التعليقات */}
          <div className="pt-1">
            <p className="text-xs text-purple-300/40 mb-2">المحادثة</p>
            {commentsLoading ? (
              <div className="flex justify-center py-3">
                <div className="w-4 h-4 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-purple-300/25 py-2 text-center">لا توجد رسائل بعد</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {comments.map(c => (
                  <div key={c.id} className={`p-2.5 rounded-xl text-xs ${
                    c.author_role === 'client'
                      ? 'bg-purple-500/10 border border-purple-500/20 mr-4'
                      : 'bg-fuchsia-500/10 border border-fuchsia-500/20 ml-4'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-medium ${
                        c.author_role === 'client' ? 'text-purple-300' : 'text-fuchsia-300'
                      }`}>{c.author_role === 'client' ? 'أنت' : c.author_name}</span>
                      <span className="text-purple-300/30">{fmt(c.created_at)}</span>
                    </div>
                    {c.body && <p className="text-white/80">{c.body}</p>}
                    {c.file_urls && c.file_urls.length > 0 && (
                      <div className="mt-2">
                        <FileThumb urls={c.file_urls} size="sm" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* إرسال تعليق */}
            <div className="mt-2 space-y-2">
              <textarea
                rows={2}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="اكتب رسالة أو ملاحظة..."
                className="w-full bg-white/5 border border-purple-500/25 rounded-xl px-3 py-2 text-xs text-white placeholder-purple-300/30 focus:outline-none resize-none"
              />
              {files.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-1 text-[10px] bg-purple-500/10 px-2 py-0.5 rounded-lg text-purple-300">
                      <span className="truncate max-w-[100px]">{f.name}</span>
                      <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="text-purple-400 hover:text-red-400">×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button onClick={() => fileRef.current?.click()}
                  className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input ref={fileRef} type="file" multiple className="hidden"
                  onChange={e => setFiles(p => [...p, ...Array.from(e.target.files ?? [])])} />
                <button
                  onClick={sendComment} disabled={sending || (!commentText.trim() && files.length === 0)}
                  className="flex-1 py-1.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-xl text-xs font-medium text-white disabled:opacity-50 hover:from-purple-500 hover:to-fuchsia-500 transition-all">
                  {sending ? 'جاري الإرسال...' : 'إرسال'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DesignCard ───────────────────────────────────────────────────────────────
function DesignCard({ req, onFeedback, highlight }: { req: CreativeRequest; onFeedback: (id: string, fb: 'approved' | 'revision_requested', note?: string) => void; highlight?: boolean }) {
  const [showNote, setShowNote]   = useState(false);
  const [note, setNote]           = useState('');
  const [acting, setActing]       = useState<'approved' | 'revision_requested' | null>(null);
  const isDone       = req.status === 'done';
  const isReview     = req.status === 'review';
  const isInProgress = req.status === 'in_progress';

  const handleAction = async (fb: 'approved' | 'revision_requested', n?: string) => {
    setActing(fb);
    await onFeedback(req.id, fb, n);
    setActing(null);
  };

  const borderCls = isDone
    ? 'bg-green-500/5 border-green-500/25'
    : highlight
      ? 'bg-orange-500/5 border-orange-500/30'
      : isInProgress
        ? 'bg-orange-500/5 border-orange-400/20'
        : 'bg-white/5 border-purple-500/20';

  return (
    <div className={`rounded-2xl border overflow-hidden ${borderCls}`}>

      {/* شارة معتمد */}
      {isDone && (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border-b border-green-500/20">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-semibold text-green-400">تم الاعتماد</span>
        </div>
      )}

      {/* شارة تحت التعديل */}
      {isInProgress && req.client_feedback === 'revision_requested' && (
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border-b border-orange-500/20">
          <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-xs font-semibold text-orange-400">تحت التعديل</span>
          {req.client_feedback_note && (
            <span className="text-[10px] text-orange-300/70 mr-1">— {req.client_feedback_note}</span>
          )}
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-white">{req.title}</p>
            <p className="text-xs text-purple-300/50 mt-0.5">{TYPE_LABELS[req.request_type] ?? req.request_type}</p>
          </div>
        </div>

        {/* الملفات */}
        {req.result_files && req.result_files.length > 0 && (
          <FileThumb urls={req.result_files} />
        )}

        {/* أزرار الاعتماد — تظهر فقط عند review بغض النظر عن client_feedback القديم */}
        {isReview && (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-orange-400 font-medium">التصميم جاهز — هل تعتمده؟</p>
            <div className="flex gap-2">
              <button
                disabled={!!acting}
                onClick={() => handleAction('approved')}
                className="flex-1 py-2.5 bg-green-500/15 border border-green-500/30 rounded-xl text-xs text-green-400 font-semibold hover:bg-green-500/25 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                {acting === 'approved' ? (
                  <><div className="w-3 h-3 rounded-full border-2 border-green-400/30 border-t-green-400 animate-spin" /> جاري...</>
                ) : '✓ اعتماد'}
              </button>
              <button
                disabled={!!acting}
                onClick={() => setShowNote(v => !v)}
                className="flex-1 py-2.5 bg-orange-500/15 border border-orange-500/30 rounded-xl text-xs text-orange-400 font-semibold hover:bg-orange-500/25 transition-colors disabled:opacity-60">
                ✕ طلب تعديل
              </button>
            </div>
            {showNote && (
              <div className="space-y-2">
                <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                  placeholder="اكتب ملاحظات التعديل..."
                  className="w-full bg-white/5 border border-orange-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-purple-300/30 focus:outline-none resize-none" />
                <button
                  disabled={!!acting}
                  onClick={() => { handleAction('revision_requested', note); setShowNote(false); }}
                  className="w-full py-2 bg-orange-500/20 border border-orange-500/40 rounded-xl text-xs text-orange-400 font-medium hover:bg-orange-500/30 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                  {acting === 'revision_requested' ? (
                    <><div className="w-3 h-3 rounded-full border-2 border-orange-400/30 border-t-orange-400 animate-spin" /> جاري...</>
                  ) : 'إرسال الملاحظات'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BrandIdentityModal ───────────────────────────────────────────────────────
function BrandIdentityModal({
  storeId, current, onClose, onSave,
}: {
  storeId: string;
  current: BrandIdentity | null;
  onClose: () => void;
  onSave: (identity: BrandIdentity) => void;
}) {
  const [brandColors, setBrandColors] = useState(current?.brand_colors ?? '');
  const [fonts,       setFonts]       = useState(current?.fonts       ?? '');
  const [notes,       setNotes]       = useState(current?.notes       ?? '');
  const [logoUrls,      setLogoUrls]      = useState<string[]>(current?.logo_urls      ?? []);
  const [guidelineUrls, setGuidelineUrls] = useState<string[]>(current?.guideline_urls ?? []);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingGuide, setUploadingGuide] = useState(false);
  const [saving, setSaving]           = useState(false);
  const logoRef  = useRef<HTMLInputElement>(null);
  const guideRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, type: 'logo' | 'guideline'): Promise<string | null> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    const res = await fetch(`/api/public/store/${storeId}/brand-identity/upload`, { method: 'POST', body: fd });
    if (!res.ok) return null;
    const { url } = await res.json();
    return url;
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingLogo(true);
    const urls = await Promise.all(files.map(f => uploadFile(f, 'logo')));
    setLogoUrls(prev => [...prev, ...(urls.filter(Boolean) as string[])]);
    setUploadingLogo(false);
    e.target.value = '';
  };

  const handleGuideChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingGuide(true);
    const urls = await Promise.all(files.map(f => uploadFile(f, 'guideline')));
    setGuidelineUrls(prev => [...prev, ...(urls.filter(Boolean) as string[])]);
    setUploadingGuide(false);
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/public/store/${storeId}/brand-identity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_colors: brandColors || null,
          fonts:        fonts       || null,
          notes:        notes       || null,
          logo_urls:      logoUrls,
          guideline_urls: guidelineUrls,
        }),
      });
      if (res.ok) {
        const { identity } = await res.json();
        onSave(identity);
      }
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#130825] border border-indigo-500/30 rounded-3xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-indigo-500/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white">هوية المتجر</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-indigo-400 hover:bg-indigo-500/10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* الشعار */}
          <div>
            <label className="block text-xs text-indigo-300/70 mb-2 font-medium">الشعار (بأعلى دقة ممكنة)</label>
            <input ref={logoRef} type="file" multiple accept="image/*,.pdf,.svg,.ai,.eps,.zip" className="hidden" onChange={handleLogoChange} />
            <div className="flex flex-wrap gap-2 mb-2">
              {logoUrls.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl border border-indigo-500/30 bg-white/5 overflow-hidden group">
                  {/\.(jpe?g|png|gif|webp|svg)$/i.test(url) ? (
                    <img src={url} alt="logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                  <button onClick={() => setLogoUrls(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-1 left-1 w-5 h-5 rounded-full bg-red-500/80 text-white text-[10px] items-center justify-center hidden group-hover:flex">✕</button>
                </div>
              ))}
              <button onClick={() => logoRef.current?.click()}
                disabled={uploadingLogo}
                className="w-20 h-20 rounded-xl border border-dashed border-indigo-500/40 bg-indigo-500/5 flex flex-col items-center justify-center gap-1 text-indigo-400 hover:bg-indigo-500/10 transition-all disabled:opacity-50">
                {uploadingLogo ? (
                  <div className="w-5 h-5 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-[10px]">رفع</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* دليل الهوية */}
          <div>
            <label className="block text-xs text-indigo-300/70 mb-2 font-medium">دليل الهوية (Brand Guidelines)</label>
            <input ref={guideRef} type="file" multiple accept=".pdf,.zip,.rar,.docx,.pptx,.ai,.eps" className="hidden" onChange={handleGuideChange} />
            <div className="space-y-1.5 mb-2">
              {guidelineUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/5 border border-indigo-500/20 rounded-xl px-3 py-2">
                  <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-xs text-indigo-300 truncate flex-1">{url.split('/').pop()}</span>
                  <button onClick={() => setGuidelineUrls(prev => prev.filter((_, j) => j !== i))} className="text-red-400 text-xs hover:text-red-300">✕</button>
                </div>
              ))}
            </div>
            <button onClick={() => guideRef.current?.click()}
              disabled={uploadingGuide}
              className="w-full py-2.5 border border-dashed border-indigo-500/40 rounded-xl text-xs text-indigo-400 hover:bg-indigo-500/5 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {uploadingGuide ? (
                <><div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" /> جاري الرفع...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg> رفع ملف دليل الهوية</>
              )}
            </button>
          </div>

          {/* الألوان */}
          <div>
            <label className="block text-xs text-indigo-300/70 mb-1.5 font-medium">ألوان البراند المعتمدة</label>
            <textarea
              rows={3}
              value={brandColors}
              onChange={e => setBrandColors(e.target.value)}
              placeholder={"مثال:\n#1E40AF - أزرق رئيسي\n#FFFFFF - أبيض\n#F59E0B - ذهبي"}
              className="w-full bg-white/5 border border-indigo-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:border-indigo-400 resize-none font-mono"
            />
            <p className="text-[10px] text-purple-300/40 mt-1">اكتب كل لون في سطر مستقل، ويفضل كتابة كود اللون HEX</p>
          </div>

          {/* الخطوط */}
          <div>
            <label className="block text-xs text-indigo-300/70 mb-1.5 font-medium">الخطوط المستخدمة في الهوية</label>
            <textarea
              rows={3}
              value={fonts}
              onChange={e => setFonts(e.target.value)}
              placeholder={"مثال:\nArabic: Cairo Bold\nEnglish: Poppins Regular\nيمكن رفع ملفات الخطوط في حقل دليل الهوية"}
              className="w-full bg-white/5 border border-indigo-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:border-indigo-400 resize-none"
            />
          </div>

          {/* ملاحظات */}
          <div>
            <label className="block text-xs text-indigo-300/70 mb-1.5 font-medium">ملاحظات إضافية للمصمم</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي تفاصيل إضافية تساعد المصمم على فهم هوية متجرك..."
              className="w-full bg-white/5 border border-indigo-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:border-indigo-400 resize-none"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-5 border-t border-indigo-500/20 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl text-sm font-bold text-white hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> جاري الحفظ...</>
            ) : 'حفظ هوية المتجر'}
          </button>
        </div>

      </div>
    </div>
  );
}
