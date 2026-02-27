'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';

// ─── Lightbox ───────────────────────────────────────────────────────
function Lightbox({ urls, startIndex, onClose }: { urls: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const url = urls[idx];
  const isImg = /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(url) ||
    (url.includes('supabase') && !url.match(/\.(pdf|zip|rar|docx?|xlsx?|mp4|mov)$/i));

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
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/70 hover:text-white">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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

// ─── FileThumb ───────────────────────────────────────────────────────
function FileThumb({ urls, size = 'md' }: { urls: string[]; size?: 'sm' | 'md' }) {
  const [lb, setLb] = useState<number | null>(null);
  const dim = size === 'sm' ? 'w-12 h-12' : 'w-14 h-14';
  const isImg = (u: string) => /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(u) ||
    (u.includes('supabase') && !u.match(/\.(pdf|zip|rar|docx?|xlsx?|mp4|mov)$/i));
  const ext = (u: string) => u.split('.').pop()?.split('?')[0]?.toUpperCase().slice(0, 4) ?? 'FILE';
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {urls.map((u, i) => (
          <button key={i} onClick={e => { e.stopPropagation(); setLb(i); }}
            className={`${dim} rounded-lg overflow-hidden border-2 border-purple-500/30 hover:border-purple-400 transition-all flex-shrink-0 relative group`}>
            {isImg(u) ? (
              <img src={u} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-purple-500/10 flex flex-col items-center justify-center gap-0.5">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-[8px] text-purple-300/60 font-bold">{ext(u)}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

// ─── Types ───────────────────────────────────────────────────────
interface Comment {
  id: string;
  request_id: string;
  body: string | null;
  author_name: string;
  author_role: string;
  file_urls: string[];
  created_at: string;
}

interface DesignRequest {
  id: string;
  title: string;
  request_type: string;
  status: string;
  priority: string;
  platform?: string;
  description?: string;
  result_files?: string[];
  created_at: string;
  updated_at: string;
  store_id: string;
  stores?: { id: string; store_name: string | null; store_url: string };
  comments?: Comment[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const COLUMNS: { id: string; label: string; color: string; border: string; dot: string }[] = [
  { id: 'new',         label: 'جديد',           color: 'bg-blue-500/10',   border: 'border-blue-500/30',   dot: 'bg-blue-400'   },
  { id: 'in_progress', label: 'تحت التنفيذ',    color: 'bg-purple-500/10', border: 'border-purple-500/30', dot: 'bg-purple-400' },
  { id: 'review',      label: 'تحت المراجعة',   color: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  { id: 'done',        label: 'معتمد',          color: 'bg-green-500/10',  border: 'border-green-500/30',  dot: 'bg-green-400'  },
];

const TYPE_LABELS: Record<string, string> = {
  design: 'تصميم', video: 'فيديو', photo: 'صورة', copy: 'محتوى', other: 'أخرى',
};

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  low:    { label: 'منخفضة', color: 'text-gray-400 bg-gray-500/10'    },
  normal: { label: 'عادية',  color: 'text-blue-400 bg-blue-500/10'    },
  high:   { label: 'عالية',  color: 'text-orange-400 bg-orange-500/10' },
  urgent: { label: 'عاجل',   color: 'text-red-400 bg-red-500/10'       },
};

// ─── Card Component ──────────────────────────────────────────────────────────────
function RequestCard({
  req,
  onDragStart,
  onStatusChange,
  onDelete,
}: {
  req: DesignRequest;
  onDragStart: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const [moving, setMoving]           = useState(false);
  const [open, setOpen]               = useState(false);
  const [comments, setComments]       = useState<Comment[]>(req.comments ?? []);
  const [commLoading, setCommLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [files, setFiles]             = useState<File[]>([]);
  const [sending, setSending]         = useState(false);
  const fileRef                       = useRef<HTMLInputElement>(null);
  const pm = PRIORITY_META[req.priority] ?? { label: req.priority, color: 'text-gray-400 bg-gray-500/10' };
  const storeName = req.stores?.store_name || req.stores?.store_url || '—';

  const fmt = (d: string) => new Date(d).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
  const fmtFull = (d: string) => new Date(d).toLocaleString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const loadComments = useCallback(async () => {
    setCommLoading(true);
    try {
      const res  = await fetch(`/api/admin/designs/${req.id}/comments`);
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch { /* silent */ }
    finally { setCommLoading(false); }
  }, [req.id]);

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
      const urls: string[] = [];
      for (const f of files) { const u = await uploadFile(f); if (u) urls.push(u); }
      const adminUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('admin_user') || '{}') : {};
      await fetch(`/api/admin/designs/${req.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentText, author_name: adminUser.name || 'فريق جود', author_role: 'designer', file_urls: urls }),
      });
      setCommentText('');
      setFiles([]);
      await loadComments();
    } catch { /* silent */ }
    finally { setSending(false); }
  };

  return (
    <div
      draggable={!open}
      onDragStart={() => { if (!open) onDragStart(req.id); }}
      className="bg-[#130825] border border-purple-500/20 rounded-xl overflow-hidden hover:border-purple-400/40 transition-all"
    >
      {/* Header — قابل للسحب */}
      <div className="p-3 cursor-grab active:cursor-grabbing select-none">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-medium text-white leading-snug flex-1">{req.title}</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0 font-medium ${pm.color}`}>{pm.label}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300">{TYPE_LABELS[req.request_type] ?? req.request_type}</span>
          {req.platform && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">{req.platform}</span>}
        </div>
        <p className="text-[10px] text-purple-300/50 mb-2 truncate">{storeName}</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-purple-300/30">{fmt(req.created_at)}</span>
          <div className="flex items-center gap-2">
            {/* Quick move */}
            <div className="flex items-center gap-1">
              {COLUMNS.filter(c => c.id !== req.status).map(col => (
                <button key={col.id} disabled={moving}
                  onClick={async (e) => { e.stopPropagation(); setMoving(true); await onStatusChange(req.id, col.id); setMoving(false); }}
                  title={`نقل إلى: ${col.label}`}
                  className={`w-2 h-2 rounded-full ${col.dot} opacity-50 hover:opacity-100 transition-opacity`}
                />
              ))}
            </div>
            {/* Toggle comments */}
            <button onClick={() => setOpen(v => !v)} title="المحادثة"
              className="p-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 transition-colors">
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            {/* Delete */}
            <button onClick={(e) => { e.stopPropagation(); onDelete(req.id); }} title="حذف الطلب"
              className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors">
              <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        {req.description && <p className="text-[10px] text-purple-300/40 mt-2 line-clamp-2">{req.description}</p>}
      </div>

      {/* Comments Panel */}
      {open && (
        <div className="border-t border-purple-500/15 p-3 space-y-2" onClick={e => e.stopPropagation()}>
          {/* قائمة التعليقات */}
          {commLoading ? (
            <div className="flex justify-center py-2">
              <div className="w-4 h-4 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-[10px] text-purple-300/25 text-center py-1">لا توجد رسائل</p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className={`p-2 rounded-lg text-[10px] ${
                  c.author_role === 'client'
                    ? 'bg-purple-500/10 border border-purple-500/20'
                    : 'bg-fuchsia-500/10 border border-fuchsia-500/20'
                }`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`font-semibold ${
                      c.author_role === 'client' ? 'text-purple-300' : 'text-fuchsia-300'
                    }`}>{c.author_role === 'client' ? 'العميل' : c.author_name}</span>
                    <span className="text-purple-300/30">{fmtFull(c.created_at)}</span>
                  </div>
                  {c.body && <p className="text-white/80">{c.body}</p>}
                  {c.file_urls?.length > 0 && (
                    <div className="mt-1.5">
                      <FileThumb urls={c.file_urls} size="sm" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* إرسال تعليق */}
          <div className="space-y-1.5">
            <textarea rows={2} value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder="اكتب رداً أو أرفق ملف..."
              className="w-full bg-white/5 border border-purple-500/20 rounded-lg px-2.5 py-1.5 text-[10px] text-white placeholder-purple-300/30 focus:outline-none resize-none" />
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 text-[10px] bg-purple-500/10 px-1.5 py-0.5 rounded text-purple-300">
                    <span className="truncate max-w-[80px]">{f.name}</span>
                    <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1.5">
              <button onClick={() => fileRef.current?.click()}
                className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input ref={fileRef} type="file" multiple className="hidden"
                onChange={e => setFiles(p => [...p, ...Array.from(e.target.files ?? [])])} />
              <button onClick={sendComment} disabled={sending || (!commentText.trim() && files.length === 0)}
                className="flex-1 py-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-lg text-[10px] font-medium text-white disabled:opacity-50">
                {sending ? 'جاري...' : 'إرسال'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Column Component ─────────────────────────────────────────────────────────
function KanbanColumn({
  col,
  cards,
  onDragStart,
  onDrop,
  onStatusChange,
  onDelete,
}: {
  col: typeof COLUMNS[0];
  cards: DesignRequest[];
  onDragStart: (id: string) => void;
  onDrop: (targetStatus: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <div
      className={`flex flex-col min-h-[200px] rounded-2xl border ${col.border} ${col.color} transition-all ${over ? 'ring-2 ring-purple-400/50' : ''}`}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={() => { setOver(false); onDrop(col.id); }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${col.dot}`} />
          <span className="text-sm font-semibold text-white">{col.label}</span>
        </div>
        <span className="text-xs font-bold text-purple-300/50 bg-purple-500/10 px-2 py-0.5 rounded-full">
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {cards.length === 0 && (
          <div className="flex items-center justify-center h-20 text-purple-300/20 text-xs">
            لا توجد طلبات
          </div>
        )}
        {cards.map(req => (
          <RequestCard
            key={req.id}
            req={req}
            onDragStart={onDragStart}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DesignsClient() {
  const [requests, setRequests]   = useState<DesignRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [stores, setStores]       = useState<{ id: string; name: string }[]>([]);
  const dragId                    = useRef<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterStore
        ? `/api/admin/designs?store_id=${filterStore}`
        : '/api/admin/designs';
      const res  = await fetch(url);
      const data = await res.json();
      const list: DesignRequest[] = data.requests ?? [];
      setRequests(list);

      // استخراج المتاجر الفريدة للفلتر
      const seen = new Set<string>();
      const storeList: { id: string; name: string }[] = [];
      for (const r of list) {
        if (r.store_id && !seen.has(r.store_id)) {
          seen.add(r.store_id);
          storeList.push({
            id:   r.store_id,
            name: r.stores?.store_name || r.stores?.store_url || r.store_id,
          });
        }
      }
      setStores(storeList);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filterStore]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const deleteRequest = useCallback(async (id: string) => {
    if (!window.confirm('هل تريد حذف هذا الطلب نهائياً؟')) return;
    setRequests(prev => prev.filter(r => r.id !== id));
    try {
      await fetch(`/api/admin/designs?id=${id}`, { method: 'DELETE' });
    } catch {
      fetchRequests();
    }
  }, [fetchRequests]);

  const updateStatus = useCallback(async (id: string, status: string) => {
    // Optimistic update
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    try {
      await fetch('/api/admin/designs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
    } catch {
      // Revert on error
      fetchRequests();
    }
  }, [fetchRequests]);

  const handleDrop = useCallback((targetStatus: string) => {
    if (!dragId.current) return;
    updateStatus(dragId.current, targetStatus);
    dragId.current = null;
  }, [updateStatus]);

  // فلترة بالبحث
  const filtered = requests.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      (r.stores?.store_name ?? '').toLowerCase().includes(q) ||
      (r.stores?.store_url ?? '').toLowerCase().includes(q)
    );
  });

  // تجميع حسب العمود
  const byCol = (status: string) => filtered.filter(r => r.status === status);

  // إجماليات سريعة
  const totalNew        = requests.filter(r => r.status === 'new').length;
  const totalInProgress = requests.filter(r => r.status === 'in_progress').length;
  const totalReview     = requests.filter(r => r.status === 'review').length;
  const totalDone       = requests.filter(r => r.status === 'done').length;

  return (
    <div className="min-h-screen bg-[#0a0118] text-white p-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">طلبات التصاميم</h1>
          <p className="text-sm text-purple-300/50 mt-0.5">
            {requests.length} طلب إجمالاً
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-xl text-sm text-purple-300 hover:bg-purple-600/30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'جديد',        count: totalNew,        color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20'   },
          { label: 'تحت التنفيذ', count: totalInProgress, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
          { label: 'تحت المراجعة',count: totalReview,     color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
          { label: 'معتمد',       count: totalDone,       color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20'  },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <p className="text-xs text-purple-300/50 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="بحث في الطلبات..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2 text-sm bg-purple-900/20 border border-purple-500/20 rounded-xl text-white placeholder-purple-300/30 focus:outline-none focus:border-purple-400/50"
          />
        </div>
        <select
          value={filterStore}
          onChange={e => setFilterStore(e.target.value)}
          className="px-3 py-2 text-sm bg-purple-900/20 border border-purple-500/20 rounded-xl text-white focus:outline-none focus:border-purple-400/50"
        >
          <option value="">كل المتاجر</option>
          {stores.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
        </div>
      ) : (
        /* Kanban Board */
        <div className="grid grid-cols-4 gap-4">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              col={col}
              cards={byCol(col.id)}
              onDragStart={id => { dragId.current = id; }}
              onDrop={handleDrop}
              onStatusChange={updateStatus}
              onDelete={deleteRequest}
            />
          ))}
        </div>
      )}
    </div>
  );
}
