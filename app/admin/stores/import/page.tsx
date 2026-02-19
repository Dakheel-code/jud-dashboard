'use client';

import { useState, useCallback } from 'react';
import UploadStep from './_components/UploadStep';
import PreviewTable, { ImportRow } from './_components/PreviewTable';
import DoneStep from './_components/DoneStep';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ImportJob {
  id: string; status: string; source_name: string;
  total_rows: number; valid_rows: number; warning_rows: number;
  error_rows: number; committed_rows: number; skipped_rows: number;
}
interface PreviewData {
  job: ImportJob; rows: ImportRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
interface CommitResult { inserted: number; updated: number; skipped: number; errors: string[]; }
type FilterType = 'all' | 'valid' | 'warning' | 'error';
type StepType   = 'upload' | 'preview' | 'done';

// ─── Component ────────────────────────────────────────────────────────────────
export default function StoreImportPage() {
  const [step, setStep]               = useState<StepType>('upload');
  const [uploading, setUploading]     = useState(false);
  const [committing, setCommitting]   = useState(false);
  const [error, setError]             = useState('');
  const [job, setJob]                 = useState<ImportJob | null>(null);
  const [preview, setPreview]         = useState<PreviewData | null>(null);
  const [filter, setFilter]           = useState<FilterType>('all');
  const [page, setPage]               = useState(1);
  const [loadingRows, setLoadingRows] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  // ── Fetch Preview ──────────────────────────────────────────────────────────
  const fetchPreview = useCallback(async (jobId: string, p = 1, f: FilterType = 'all') => {
    setLoadingRows(true);
    try {
      const res  = await fetch(`/api/admin/stores/import/${jobId}/preview?page=${p}&pageSize=50&filter=${f}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoadingRows(false); }
  }, []);

  // ── Process upload response ────────────────────────────────────────────────
  const processResponse = async (res: Response, sourceName: string) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    const j: ImportJob = {
      id: data.job_id, status: 'validated', source_name: sourceName,
      total_rows: data.total, valid_rows: data.valid,
      warning_rows: data.warnings, error_rows: data.errors,
      committed_rows: 0, skipped_rows: 0,
    };
    setJob(j);
    await fetchPreview(data.job_id, 1, 'all');
    setStep('preview');
  };

  // ── Upload file ────────────────────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    setError(''); setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/admin/stores/import/upload', { method: 'POST', body: fd });
      await processResponse(res, file.name);
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); }
  };

  // ── Google Sheet ───────────────────────────────────────────────────────────
  const handleSheetImport = async (url: string) => {
    if (!url.trim()) return;
    setError(''); setUploading(true);
    try {
      const res = await fetch('/api/admin/stores/import/google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet_url: url }),
      });
      await processResponse(res, 'Google Sheet');
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); }
  };

  // ── Commit ─────────────────────────────────────────────────────────────────
  const handleCommit = async () => {
    if (!job) return;
    setCommitting(true); setError('');
    try {
      const res  = await fetch(`/api/admin/stores/import/${job.id}/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skip_errors: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCommitResult(data);
      setStep('done');
    } catch (e: any) { setError(e.message); }
    finally { setCommitting(false); }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep('upload'); setJob(null); setPreview(null);
    setError(''); setFilter('all'); setPage(1); setCommitResult(null);
  };

  // ── Filter / Pagination ────────────────────────────────────────────────────
  const changeFilter = (f: FilterType) => {
    setFilter(f); setPage(1);
    if (job) fetchPreview(job.id, 1, f);
  };
  const changePage = (p: number) => {
    setPage(p);
    if (job) fetchPreview(job.id, p, filter);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0d0520] text-white p-6" dir="rtl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">استيراد المتاجر</h1>
          <p className="text-purple-400 mt-1 text-sm">رفع ملف Excel أو Google Sheet لاستيراد المتاجر بشكل مجمّع</p>
        </div>
        <button
          onClick={() => window.open('/api/admin/stores/import/template', '_blank')}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 rounded-xl text-purple-300 hover:text-white transition-all text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          تحميل القالب العربي
        </button>
      </div>

      {/* ── Steps Indicator ── */}
      <div className="flex items-center gap-3 mb-8">
        {(['upload', 'preview', 'done'] as StepType[]).map((s, i) => {
          const labels = ['رفع الملف', 'المعاينة والتحقق', 'تم الاستيراد'];
          const active = step === s;
          const done   = (step === 'preview' && i === 0) || (step === 'done' && i < 2);
          return (
            <div key={s} className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${active ? 'bg-purple-600 text-white' : done ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-gray-500'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                  ${active ? 'bg-white/20' : done ? 'bg-green-500/30' : 'bg-white/10'}`}>
                  {done ? '✓' : i + 1}
                </span>
                {labels[i]}
              </div>
              {i < 2 && <div className={`w-8 h-px ${done || active ? 'bg-purple-500' : 'bg-white/10'}`} />}
            </div>
          );
        })}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
          <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-300 text-sm flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-200 text-lg leading-none">✕</button>
        </div>
      )}

      {/* ══ STEP 1: Upload ══ */}
      {step === 'upload' && (
        <UploadStep onUpload={handleUpload} onSheetImport={handleSheetImport} uploading={uploading} />
      )}

      {/* ══ STEP 2: Preview ══ */}
      {step === 'preview' && job && preview && (
        <div className="space-y-5">

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'الإجمالي', value: job.total_rows,   color: 'text-white',      bg: 'bg-white/5 border-white/10'            },
              { label: 'صالحة',    value: job.valid_rows,   color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20'   },
              { label: 'تحذيرات', value: job.warning_rows, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
              { label: 'أخطاء',   value: job.error_rows,   color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20'       },
              {
                label: 'مكررة',
                value: preview.rows.filter(r => r.expected_action === 'update').length,
                color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20',
              },
            ].map(c => (
              <div key={c.label} className={`border rounded-xl p-4 text-center ${c.bg}`}>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-gray-400 text-xs mt-1">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Filter Tabs */}
            <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
              {([
                { key: 'all',     label: 'الكل',    count: job.total_rows   },
                { key: 'valid',   label: 'صالحة',   count: job.valid_rows   },
                { key: 'warning', label: 'تحذيرات', count: job.warning_rows },
                { key: 'error',   label: 'أخطاء',   count: job.error_rows   },
              ] as { key: FilterType; label: string; count: number }[]).map(t => (
                <button key={t.key} onClick={() => changeFilter(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5
                    ${filter === t.key ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  {t.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === t.key ? 'bg-white/20' : 'bg-white/10'}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => window.open(`/api/admin/stores/import/${job.id}/export`, '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                تنزيل التقرير
              </button>
              <button onClick={reset}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                ملف جديد
              </button>
              <button
                onClick={handleCommit}
                disabled={committing || (job.valid_rows + job.warning_rows) === 0}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-sm"
              >
                {committing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    تنفيذ الاستيراد ({job.valid_rows + job.warning_rows})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Table */}
          <PreviewTable rows={preview.rows} loading={loadingRows} />

          {/* Pagination */}
          {preview.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => changePage(page - 1)} disabled={page <= 1}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-all"
              >
                ‹ السابق
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(preview.pagination.totalPages, 7) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button key={p} onClick={() => changePage(p)}
                      className={`w-8 h-8 rounded-lg text-sm transition-all ${page === p ? 'bg-purple-600 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
                      {p}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => changePage(page + 1)} disabled={page >= preview.pagination.totalPages}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed text-sm transition-all"
              >
                التالي ›
              </button>
              <span className="text-gray-500 text-xs mr-2">
                {preview.pagination.total} صف إجمالاً
              </span>
            </div>
          )}
        </div>
      )}

      {/* ══ STEP 3: Done ══ */}
      {step === 'done' && commitResult && job && (
        <DoneStep result={commitResult} jobId={job.id} onReset={reset} />
      )}

    </div>
  );
}
