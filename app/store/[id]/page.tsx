'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface StoreInfo {
  id: string;
  store_name: string | null;
  store_url: string;
  status: string;
  meta_account?: string | null;
  snapchat_account?: string | null;
  tiktok_account?: string | null;
}

interface StoreTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  type?: string;
  category?: string;
  is_done: boolean;
  due_date?: string | null;
  created_at: string;
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
  const [tasks, setTasks]       = useState<StoreTask[]>([]);
  const [loading, setLoading]   = useState(true);

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
      setTasks(data.tasks ?? []);
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

        {/* ══════════════ قسم الطلبات ══════════════ */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-fuchsia-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2.414a2 2 0 01.586-1.414z" />
                </svg>
              </span>
              الطلبات
              {requests.length > 0 && (
                <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">{requests.length}</span>
              )}
            </h2>
            <button
              onClick={() => { setShowForm(true); setSubmitted(null); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-xl text-sm font-medium hover:from-purple-500 hover:to-fuchsia-500 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              طلب جديد
            </button>
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-10 text-purple-300/40 bg-white/3 border border-purple-500/10 rounded-2xl">
              <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </section>

        {/* ══════════════ قسم التصاميم ══════════════ */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            التصاميم
            {pendingReview.length > 0 && (
              <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full animate-pulse">
                {pendingReview.length} بانتظار مراجعتك
              </span>
            )}
          </h2>

          {pendingReview.length > 0 && (
            <div className="space-y-3">
              {pendingReview.map(req => (
                <DesignCard key={req.id} req={req} onFeedback={handleFeedback} highlight />
              ))}
            </div>
          )}

          {designs.filter(r => r.status !== 'review').length > 0 && (
            <div className="space-y-3">
              {pendingReview.length > 0 && (
                <p className="text-xs text-purple-300/40 px-1">المنجزة</p>
              )}
              {designs.filter(r => r.status !== 'review').map(req => (
                <DesignCard key={req.id} req={req} onFeedback={handleFeedback} />
              ))}
            </div>
          )}

          {designs.length === 0 && pendingReview.length === 0 && (
            <div className="text-center py-10 text-purple-300/40 bg-white/3 border border-purple-500/10 rounded-2xl">
              <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">لا توجد تصاميم بعد</p>
              <p className="text-xs mt-1 opacity-60">ستظهر هنا عند إرسال الفريق للتصاميم</p>
            </div>
          )}
        </section>

        {/* ══════════════ قسم المهام ══════════════ */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </span>
            المهام
            {tasks.filter(t => !t.is_done).length > 0 && (
              <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                {tasks.filter(t => !t.is_done).length} قيد التنفيذ
              </span>
            )}
          </h2>

          {tasks.length === 0 ? (
            <div className="text-center py-10 text-purple-300/40 bg-white/3 border border-purple-500/10 rounded-2xl">
              <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm">لا توجد مهام بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.filter(t => !t.is_done).map(task => (
                <TaskRow key={task.id} task={task} />
              ))}
              {tasks.filter(t => t.is_done).length > 0 && (
                <>
                  <p className="text-xs text-green-400/40 px-1 pt-2">منجزة ({tasks.filter(t => t.is_done).length})</p>
                  {tasks.filter(t => t.is_done).map(task => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </>
              )}
            </div>
          )}
        </section>

        {/* ══════════════ قسم الإعلانات ══════════════ */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </span>
            الإعلانات
          </h2>

          {(store?.meta_account || store?.snapchat_account || store?.tiktok_account) ? (
            <div className="space-y-3">
                {store?.snapchat_account && (
                  <div className="flex items-center justify-between p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-500/15 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 512 512" fill="currentColor">
                          <path d="M496.926,366.6c-3.373-9.176-9.8-14.086-17.112-18.153-1.376-.806-2.641-1.451-3.72-1.947-2.182-1.128-4.414-2.22-6.634-3.373-22.8-12.09-40.609-27.341-52.959-45.42a102.889,102.889,0,0,1-9.089-16.269c-1.054-2.766-.992-4.377-.065-5.954a11.249,11.249,0,0,1,3.088-2.818c2.766-1.8,5.669-3.373,8.2-4.7,4.7-2.5,8.5-4.5,10.9-5.954,7.287-4.477,12.5-9.4,15.5-14.629a24.166,24.166,0,0,0,1.863-22.031c-4.328-12.266-17.9-19.263-28.263-19.263a35.007,35.007,0,0,0-9.834,1.376c-.124.037-.236.074-.347.111,0-1.451.024-2.915.024-4.377,0-22.92-2.508-46.152-10.9-67.615C378.538,91.727,341.063,56.7,286.741,50.6a118.907,118.907,0,0,0-12.293-.621h-36.9a118.907,118.907,0,0,0-12.293.621c-54.31,6.1-91.785,41.127-110.839,84.168-8.4,21.463-10.9,44.7-10.9,67.615,0,1.462.012,2.926.024,4.377-.111-.037-.223-.074-.347-.111a35.007,35.007,0,0,0-9.834-1.376c-10.362,0-23.935,7-28.263,19.263a24.166,24.166,0,0,0,1.863,22.031c3,5.233,8.213,10.152,15.5,14.629,2.4,1.451,6.2,3.46,10.9,5.954,2.52,1.327,5.418,2.9,8.181,4.7a11.3,11.3,0,0,1,3.088,2.818c.927,1.576.989,3.187-.065,5.954a102.889,102.889,0,0,1-9.089,16.269c-12.35,18.079-30.161,33.33-52.959,45.42-2.22,1.153-4.452,2.245-6.634,3.373-1.079.5-2.344,1.141-3.72,1.947C9.8,352.514,3.373,357.424,0,366.6a28,28,0,0,0,2.246,23.34c2.58,4.131,9.645,11.83,26.719,14.68a12.6,12.6,0,0,1,5.159,2.367,17.565,17.565,0,0,1,3.186,5.567c1.689,4.926,3.5,11.718,4.342,15.192a19.146,19.146,0,0,0,6.386,10.7,20.983,20.983,0,0,0,13.341,4.31,38.631,38.631,0,0,0,6.647-.62,76.043,76.043,0,0,1,14.8-1.54,54.756,54.756,0,0,1,8.993.682c9.6,1.651,18.294,7.6,28.819,14.656C140.654,469.639,158.9,480,186.994,480a91.6,91.6,0,0,0,14.7-1.19A127.378,127.378,0,0,0,256,467.394a127.418,127.418,0,0,0,54.3,11.416A91.6,91.6,0,0,0,325,477.62c28.1,0,46.34-10.361,65.363-22.966,10.524-7.054,19.219-13,28.819-14.656a54.7,54.7,0,0,1,8.993-.682,75.864,75.864,0,0,1,14.8,1.54,38.526,38.526,0,0,0,6.647.62A20.983,20.983,0,0,0,463.065,437a19.171,19.171,0,0,0,6.386-10.7c.843-3.474,2.653-10.266,4.342-15.192a17.671,17.671,0,0,1,3.186-5.567,12.541,12.541,0,0,1,5.159-2.367c17.074-2.85,24.139-10.549,26.719-14.68A28,28,0,0,0,496.926,366.6Z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">Snapchat Ads</p>
                        <p className="text-yellow-400/60 text-xs">{store.snapchat_account}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">متصل</span>
                  </div>
                )}
                {store?.tiktok_account && (
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">TikTok Ads</p>
                        <p className="text-white/40 text-xs">{store.tiktok_account}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">متصل</span>
                  </div>
                )}
                {store?.meta_account && (
                  <div className="flex items-center justify-between p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-500/15 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 008.44-9.9c0-5.53-4.5-10.02-10-10.02z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">Meta Ads</p>
                        <p className="text-indigo-400/60 text-xs">{store.meta_account}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-green-500/15 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">متصل</span>
                  </div>
                )}
              <p className="text-xs text-purple-300/30 text-center pt-2">
                بيانات الأداء التفصيلية متاحة عبر الفريق المختص
              </p>
            </div>
          ) : (
            <div className="text-center py-10 text-purple-300/40 bg-white/3 border border-purple-500/10 rounded-2xl">
              <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              <p className="text-sm">لا توجد منصات إعلانية مرتبطة</p>
              <p className="text-xs mt-1 opacity-60">تواصل مع الفريق لإضافة حساباتك الإعلانية</p>
            </div>
          )}
        </section>

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

// ─── TaskRow ───────────────────────────────────────────────────────────────────
function TaskRow({ task }: { task: StoreTask }) {
  const TASK_STATUS: Record<string, { label: string; color: string }> = {
    open:        { label: 'جديدة',       color: 'bg-blue-500/15 text-blue-400' },
    pending:     { label: 'قيد الانتظار', color: 'bg-yellow-500/15 text-yellow-400' },
    in_progress: { label: 'قيد التنفيذ', color: 'bg-purple-500/15 text-purple-400' },
    waiting:     { label: 'بانتظار رد',  color: 'bg-orange-500/15 text-orange-400' },
    done:        { label: 'منجزة',       color: 'bg-green-500/15 text-green-400' },
    blocked:     { label: 'موقوفة',      color: 'bg-red-500/15 text-red-400' },
    canceled:    { label: 'ملغية',       color: 'bg-gray-500/15 text-gray-400' },
  };

  const s = TASK_STATUS[task.status] ?? { label: task.status, color: 'bg-gray-500/15 text-gray-400' };

  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-colors ${
      task.is_done
        ? 'bg-green-500/5 border-green-500/15 opacity-60'
        : 'bg-white/5 border-purple-500/20 hover:border-purple-400/40'
    }`}>
      {/* أيقونة الحالة */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${
        task.is_done ? 'bg-green-500/20' : 'bg-purple-500/10'
      }`}>
        {task.is_done ? (
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.is_done ? 'line-through text-white/40' : 'text-white'}`}>
          {task.title}
        </p>
        {task.category && (
          <p className="text-xs text-purple-300/40 mt-0.5">{task.category}</p>
        )}
        {task.due_date && !task.is_done && (
          <p className="text-xs text-orange-400/60 mt-0.5">
            {new Date(task.due_date) < new Date() ? '⚠️ ' : ''}
            {new Date(task.due_date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
          </p>
        )}
      </div>

      <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>
        {s.label}
      </span>
    </div>
  );
}
