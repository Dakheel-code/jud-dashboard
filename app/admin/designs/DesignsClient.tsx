'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Card Component ───────────────────────────────────────────────────────────
function RequestCard({
  req,
  onDragStart,
  onStatusChange,
}: {
  req: DesignRequest;
  onDragStart: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [moving, setMoving] = useState(false);
  const pm = PRIORITY_META[req.priority] ?? { label: req.priority, color: 'text-gray-400 bg-gray-500/10' };
  const storeName = req.stores?.store_name || req.stores?.store_url || '—';

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });

  return (
    <div
      draggable
      onDragStart={() => onDragStart(req.id)}
      className="bg-[#130825] border border-purple-500/20 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-purple-400/40 transition-all select-none"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-white leading-snug flex-1">{req.title}</p>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0 font-medium ${pm.color}`}>
          {pm.label}
        </span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300">
          {TYPE_LABELS[req.request_type] ?? req.request_type}
        </span>
        {req.platform && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
            {req.platform}
          </span>
        )}
      </div>

      {/* Store */}
      <p className="text-[10px] text-purple-300/50 mb-2 truncate">{storeName}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-purple-300/30">{fmt(req.created_at)}</span>

        {/* Quick move buttons */}
        <div className="flex items-center gap-1">
          {COLUMNS.filter(c => c.id !== req.status).map(col => (
            <button
              key={col.id}
              disabled={moving}
              onClick={async () => {
                setMoving(true);
                await onStatusChange(req.id, col.id);
                setMoving(false);
              }}
              title={`نقل إلى: ${col.label}`}
              className={`w-2 h-2 rounded-full ${col.dot} opacity-50 hover:opacity-100 transition-opacity`}
            />
          ))}
        </div>
      </div>

      {req.description && (
        <p className="text-[10px] text-purple-300/40 mt-2 line-clamp-2">{req.description}</p>
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
}: {
  col: typeof COLUMNS[0];
  cards: DesignRequest[];
  onDragStart: (id: string) => void;
  onDrop: (targetStatus: string) => void;
  onStatusChange: (id: string, status: string) => void;
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
