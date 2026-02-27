'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

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

interface AdsRow {
  platform: string;
  account_name: string;
  spend: number;
  orders: number;
  sales: number;
  roas: number;
  status: string;
}

interface AdsSummary { spend: number; orders: number; sales: number; roas: number; }

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

// ─── Constants ───────────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  design: 'تصميم', video: 'فيديو', photo: 'صورة', copy: 'محتوى', other: 'أخرى',
};

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  new:          { label: 'جديد',            color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',      dot: 'bg-blue-400' },
  waiting_info: { label: 'بانتظار معلومات', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400' },
  in_progress:  { label: 'قيد التنفيذ',     color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' },
  review:       { label: 'جاهز للمراجعة',   color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
  done:         { label: 'مكتمل',           color: 'bg-green-500/15 text-green-400 border-green-500/30',   dot: 'bg-green-400' },
  rejected:     { label: 'مرفوض',           color: 'bg-red-500/15 text-red-400 border-red-500/30',         dot: 'bg-red-400' },
  canceled:     { label: 'ملغي',            color: 'bg-gray-500/15 text-gray-400 border-gray-500/30',      dot: 'bg-gray-400' },
};

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  low: { label: 'منخفضة', color: 'text-gray-400' },
  normal: { label: 'عادية', color: 'text-blue-400' },
  high: { label: 'عالية', color: 'text-orange-400' },
  urgent: { label: 'عاجل', color: 'text-red-400' },
};

const PLATFORM_META: Record<string, { label: string; color: string; dot: string }> = {
  snapchat: { label: 'Snapchat', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  tiktok:   { label: 'TikTok',   color: 'text-white',      dot: 'bg-white'      },
  meta:     { label: 'Meta Ads', color: 'text-blue-400',   dot: 'bg-blue-400'   },
  google:   { label: 'Google',   color: 'text-green-400',  dot: 'bg-green-400'  },
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StorePublicPage() {
  const { id: storeId } = useParams<{ id: string }>();

  const [store, setStore]                     = useState<StoreInfo | null>(null);
  const [requests, setRequests]               = useState<CreativeRequest[]>([]);
  const [tasksByCategory, setTasksByCategory] = useState<Record<string, TaskItem[]>>({});
  const [tasksStats, setTasksStats]           = useState<{ total: number; completed: number; percentage: number } | null>(null);
  const [collapsedCats, setCollapsedCats]     = useState<Set<string>>(new Set());
  const [adsPlatforms, setAdsPlatforms]       = useState<AdsRow[]>([]);
  const [adsSummary, setAdsSummary]           = useState<AdsSummary | null>(null);
  const [adsRange, setAdsRange]               = useState('7d');
  const [adsLoading, setAdsLoading]           = useState(false);
  const [loading, setLoading]                 = useState(true);
  const [showForm, setShowForm]               = useState(false);
  const [submitting, setSubmitting]           = useState(false);
  const [submitted, setSubmitted]             = useState<{ id: string } | null>(null);
  const [form, setForm] = useState({
    title: '', request_type: 'design', priority: 'normal', platform: '', description: '',
  });

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch(`/api/public/store/${storeId}`);
      const data = await res.json();
      if (!res.ok) return;
      setStore(data.store);
      setRequests(data.requests ?? []);
      setTasksByCategory(data.tasks_by_category ?? {});
      setTasksStats(data.tasks_stats ?? null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [storeId]);

  const fetchAds = useCallback(async (range: string) => {
    setAdsLoading(true);
    try {
      const res  = await fetch(`/api/public/store/${storeId}/ads?range=${range}`);
      const data = await res.json();
      if (res.ok) {
        setAdsPlatforms(data.platforms ?? []);
        setAdsSummary(data.summary ?? null);
      }
    } catch { /* silent */ }
    finally { setAdsLoading(false); }
  }, [storeId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchAds(adsRange); }, [fetchAds, adsRange]);

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

  const toggleCat = (cat: string) =>
    setCollapsedCats(prev => {
      const n = new Set(prev);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });

  const designs      = requests.filter(r => r.result_files && r.result_files.length > 0);
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
                {requests.length > 0 && (
                  <p className="text-[10px] text-purple-300/50">{requests.length} طلب</p>
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
            {requests.length === 0 ? (
              <div className="text-center py-8 text-purple-300/40">
                <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2.414a2 2 0 01.586-1.414z" />
                </svg>
                <p className="text-sm">لا توجد طلبات بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(req => <RequestCard key={req.id} req={req} onFeedback={handleFeedback} />)}
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
          <div className="p-4">
            {pendingReview.length > 0 && (
              <div className="space-y-3 mb-4">
                {pendingReview.map(req => <DesignCard key={req.id} req={req} onFeedback={handleFeedback} highlight />)}
              </div>
            )}
            {designs.filter(r => r.status !== 'review').length > 0 && (
              <div className="space-y-3">
                {pendingReview.length > 0 && <p className="text-xs text-purple-300/40 px-1">المنجزة</p>}
                {designs.filter(r => r.status !== 'review').map(req => <DesignCard key={req.id} req={req} onFeedback={handleFeedback} />)}
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

        {/* ══ قسم الحملات الإعلانية ══ */}
        <section className="bg-purple-950/40 rounded-2xl border border-purple-500/20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/15">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">الحملات الإعلانية</h2>
                {adsPlatforms.length > 0 && (
                  <p className="text-[10px] text-purple-300/50">{adsPlatforms.length}/4 منصة متصلة</p>
                )}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
          </div>

          {/* بطاقات الإجمالي */}
          {adsSummary && adsPlatforms.length > 0 && (
            <div className="grid grid-cols-4 divide-x divide-purple-500/15 rtl:divide-x-reverse border-b border-purple-500/15">
              {([
                { label: 'الصرف الإجمالي',   val: adsSummary.spend.toLocaleString('ar'),  sub: 'ر.س',                cls: 'bg-red-950/30',   txt: 'text-red-300'   },
                { label: 'المبيعات الإجمالية', val: adsSummary.sales.toLocaleString('ar'),  sub: 'ر.س',                cls: '',                txt: 'text-white'     },
                { label: 'الطلبات الإجمالية', val: adsSummary.orders.toLocaleString('ar'), sub: 'طلب',               cls: 'bg-green-950/20', txt: 'text-green-400' },
                { label: 'العائد (ROAS)',      val: `${adsSummary.roas}x`,                  sub: 'العائد على الإنفاق', cls: '',                txt: 'text-white'     },
              ] as { label: string; val: string; sub: string; cls: string; txt: string }[]).map((c, i) => (
                <div key={i} className={`p-3 text-center ${c.cls}`}>
                  <p className="text-[10px] text-purple-300/50 mb-1">{c.label}</p>
                  <p className={`text-base font-bold ${c.txt}`}>{c.val}</p>
                  <p className="text-[10px] text-purple-300/40">{c.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* فلتر الفترة */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-purple-500/10">
            <span className="text-xs text-purple-300/40 ml-auto">الفترة:</span>
            {(['1d', '7d', '30d', '90d'] as const).map(r => (
              <button
                key={r}
                onClick={() => setAdsRange(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${adsRange === r ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white' : 'text-purple-300/50 hover:text-white'}`}
              >
                {r === '1d' ? 'اليوم' : r === '7d' ? '7 أيام' : r === '30d' ? '30 يوم' : '90 يوم'}
              </button>
            ))}
          </div>

          {/* جدول المنصات */}
          {adsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
            </div>
          ) : adsPlatforms.length === 0 ? (
            <div className="text-center py-10 text-purple-300/40">
              <p className="text-sm">لا توجد منصات مرتبطة</p>
              <p className="text-xs mt-1 opacity-60">تواصل مع الفريق لربط حساباتك الإعلانية</p>
            </div>
          ) : (
            <div>
              {/* header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] px-4 py-2 text-[10px] text-purple-300/40 border-b border-purple-500/10 gap-x-3">
                <span className="text-right">المنصة</span>
                <span className="text-center w-16">الصرف</span>
                <span className="text-center w-16">المبيعات</span>
                <span className="text-center w-14">الطلبات</span>
              </div>
              {adsPlatforms.map((p, i) => {
                const pm = PLATFORM_META[p.platform] ?? { label: p.platform, color: 'text-purple-300', dot: 'bg-purple-400' };
                return (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] px-4 py-3 border-b border-purple-500/10 last:border-0 hover:bg-purple-500/5 transition-colors gap-x-3">
                    <div className="flex items-center gap-2 justify-end min-w-0">
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${pm.color}`}>{pm.label}</p>
                        <p className="text-[10px] text-purple-300/40 truncate">
                          {p.account_name}
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${pm.dot} mr-1 flex-shrink-0`} />
                        </p>
                      </div>
                    </div>
                    <p className="text-center text-sm text-white font-medium self-center w-16">
                      {p.spend > 0 ? p.spend.toLocaleString('ar') : <span className="text-purple-300/30">—</span>}
                    </p>
                    <p className="text-center text-sm text-white font-medium self-center w-16">
                      {p.sales > 0 ? p.sales.toLocaleString('ar') : <span className="text-purple-300/30">—</span>}
                    </p>
                    <p className="text-center text-sm self-center w-14">
                      {p.orders > 0 ? <span className="text-green-400 font-medium">{p.orders.toLocaleString('ar')}</span> : <span className="text-purple-300/30">—</span>}
                    </p>
                  </div>
                );
              })}
              {adsSummary && (
                <div className="grid grid-cols-[1fr_auto_auto_auto] px-4 py-3 bg-purple-500/5 border-t border-purple-500/15 gap-x-3">
                  <div className="flex items-center justify-end">
                    <span className="text-xs text-purple-300/60">الإجمالي ({adsPlatforms.length} منصة)</span>
                  </div>
                  <p className="text-center text-sm font-bold text-red-300 w-16">{adsSummary.spend.toLocaleString('ar')}</p>
                  <p className="text-center text-sm font-bold text-white w-16">{adsSummary.sales.toLocaleString('ar')}</p>
                  <p className="text-center text-sm font-bold text-green-400 w-14">{adsSummary.orders.toLocaleString('ar')}</p>
                </div>
              )}
            </div>
          )}
        </section>

      </div>

      {/* ── Modal: طلب جديد ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-[#130825] border border-purple-500/30 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                <label className="block text-xs text-purple-300/70 mb-1.5">عنوان الطلب *</label>
                <input
                  type="text" required
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="مثال: تصميم بنر إعلاني..."
                  className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-400"
                />
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
                  placeholder="مثال: Snapchat، Meta..." className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-400" />
              </div>
              <div>
                <label className="block text-xs text-purple-300/70 mb-1.5">تفاصيل إضافية</label>
                <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="أي تفاصيل إضافية..." className="w-full bg-white/5 border border-purple-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-400 resize-none" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-xl font-medium text-white hover:from-purple-500 hover:to-fuchsia-500 transition-all disabled:opacity-60">
                {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RequestCard ──────────────────────────────────────────────────────────────
function RequestCard({ req, onFeedback }: { req: CreativeRequest; onFeedback: (id: string, fb: 'approved' | 'revision_requested', note?: string) => void }) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote]         = useState('');
  const s  = STATUS_META[req.status] ?? STATUS_META.new;

  return (
    <div className="p-4 bg-white/5 border border-purple-500/20 rounded-2xl space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{req.title}</p>
          <p className="text-xs text-purple-300/50 mt-0.5">{TYPE_LABELS[req.request_type] ?? req.request_type}</p>
        </div>
        <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium ${s.color}`}>{s.label}</span>
      </div>
      {req.result_files && req.result_files.length > 0 && req.status === 'review' && !req.client_feedback && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-orange-400">الملفات جاهزة — هل تعتمد؟</p>
          <div className="flex gap-2">
            <button onClick={() => onFeedback(req.id, 'approved')}
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
                placeholder="اكتب ملاحظات التعديل..."
                className="w-full bg-white/5 border border-orange-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-purple-300/30 focus:outline-none resize-none" />
              <button onClick={() => { onFeedback(req.id, 'revision_requested', note); setShowNote(false); }}
                className="w-full py-2 bg-orange-500/20 border border-orange-500/40 rounded-xl text-xs text-orange-400 font-medium hover:bg-orange-500/30 transition-colors">
                إرسال الملاحظات
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── DesignCard ───────────────────────────────────────────────────────────────
function DesignCard({ req, onFeedback, highlight }: { req: CreativeRequest; onFeedback: (id: string, fb: 'approved' | 'revision_requested', note?: string) => void; highlight?: boolean }) {
  const [showNote, setShowNote] = useState(false);
  const [note, setNote]         = useState('');
  const s = STATUS_META[req.status] ?? STATUS_META.new;

  return (
    <div className={`p-4 rounded-2xl border space-y-3 ${highlight ? 'bg-orange-500/5 border-orange-500/30' : 'bg-white/5 border-purple-500/20'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-white">{req.title}</p>
          <p className="text-xs text-purple-300/50 mt-0.5">{TYPE_LABELS[req.request_type] ?? req.request_type}</p>
        </div>
        <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium ${s.color}`}>{s.label}</span>
      </div>
      {req.result_files && req.result_files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {req.result_files.map((f, i) => (
            <a key={i} href={f} target="_blank" rel="noopener noreferrer"
              className="text-xs text-purple-400 hover:text-purple-300 underline flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              ملف {i + 1}
            </a>
          ))}
        </div>
      )}
      {req.status === 'review' && !req.client_feedback && (
        <div className="space-y-2 pt-1">
          <div className="flex gap-2">
            <button onClick={() => onFeedback(req.id, 'approved')}
              className="flex-1 py-2 bg-green-500/15 border border-green-500/30 rounded-xl text-xs text-green-400 font-medium hover:bg-green-500/25 transition-colors">
              ✓ اعتماد
            </button>
            <button onClick={() => setShowNote(v => !v)}
              className="flex-1 py-2 bg-orange-500/15 border border-orange-500/30 rounded-xl text-xs text-orange-400 font-medium hover:bg-orange-500/25 transition-colors">
              ✕ طلب تعديل
            </button>
          </div>
          {showNote && (
            <div className="space-y-2">
              <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="ملاحظات التعديل..."
                className="w-full bg-white/5 border border-orange-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-purple-300/30 focus:outline-none resize-none" />
              <button onClick={() => { onFeedback(req.id, 'revision_requested', note); setShowNote(false); }}
                className="w-full py-2 bg-orange-500/20 border border-orange-500/40 rounded-xl text-xs text-orange-400 font-medium hover:bg-orange-500/30 transition-colors">
                إرسال الملاحظات
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
