'use client';
import { useState } from 'react';

export interface CommitResult {
  inserted: number;
  updated:  number;
  skipped:  number;
  errors:   string[];
}

interface Props {
  result: CommitResult;
  jobId:  string;
  onReset: () => void;
}

type DownloadFormat = 'excel' | 'errors_excel' | 'errors_json' | 'corrected';

export default function DoneStep({ result, jobId, onReset }: Props) {
  const [downloading, setDownloading] = useState<DownloadFormat | null>(null);
  const total    = result.inserted + result.updated;
  const hasErrors = result.errors.length > 0;

  const download = async (format: DownloadFormat) => {
    setDownloading(format);
    try {
      const params = new URLSearchParams({ format });
      window.open(`/api/admin/stores/import/${jobId}/export?${params}`, '_blank');
    } finally {
      setTimeout(() => setDownloading(null), 1500);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="text-center">
        <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center
          ${total > 0 ? 'bg-green-500/20 ring-4 ring-green-500/10' : 'bg-yellow-500/20 ring-4 ring-yellow-500/10'}`}>
          {total > 0 ? (
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          ) : (
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          )}
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">
          {total > 0 ? 'تم الاستيراد بنجاح!' : 'اكتمل الاستيراد'}
        </h2>
        <p className="text-gray-400 text-sm">تمت معالجة جميع الصفوف الصالحة</p>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'متجر جديد',   value: result.inserted, color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20',  icon: '➕' },
          { label: 'تم تحديثه',   value: result.updated,  color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',    icon: '✏️' },
          { label: 'تم تجاهله',   value: result.skipped,  color: 'text-gray-400',   bg: 'bg-gray-500/10 border-gray-500/20',    icon: '⏭️' },
          { label: 'أخطاء حفظ',   value: result.errors.length, color: result.errors.length > 0 ? 'text-red-400' : 'text-gray-500', bg: result.errors.length > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-gray-500/5 border-gray-500/10', icon: '⚠️' },
        ].map(c => (
          <div key={c.label} className={`border rounded-xl p-4 text-center ${c.bg}`}>
            <div className="text-xl mb-1">{c.icon}</div>
            <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-gray-400 text-xs mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* ── Progress Bar ── */}
      {total > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>نسبة النجاح</span>
            <span>{Math.round((total / (total + result.errors.length || 1)) * 100)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all"
              style={{ width: `${Math.round((total / (total + result.errors.length || 1)) * 100)}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="text-green-400">● {result.inserted} إضافة</span>
            <span className="text-blue-400">● {result.updated} تحديث</span>
            {result.skipped > 0 && <span className="text-gray-400">● {result.skipped} تجاهل</span>}
          </div>
        </div>
      )}

      {/* ── Skipped Reason ── */}
      {result.skipped > 0 && (
        <div className="bg-gray-500/5 border border-gray-500/20 rounded-xl p-4">
          <p className="text-gray-300 text-sm font-semibold mb-2 flex items-center gap-2">
            <span>⏭️</span> سبب التجاهل ({result.skipped} صف)
          </p>
          <ul className="space-y-1 text-xs text-gray-400">
            <li>• الصفوف التي تحتوي على أخطاء تحقق (مثل: رابط المتجر مفقود)</li>
            <li>• الصفوف التي لا تحتوي على رابط متجر صالح</li>
          </ul>
        </div>
      )}

      {/* ── Commit Errors ── */}
      {hasErrors && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-sm font-semibold mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            أخطاء أثناء الحفظ ({result.errors.length})
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {result.errors.map((e, i) => (
              <div key={i} className="flex items-start gap-2 text-xs bg-red-500/5 rounded-lg px-3 py-2">
                <span className="text-red-500 shrink-0 font-bold">{i + 1}.</span>
                <span className="text-red-300">{e}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Download Buttons ── */}
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <p className="text-white font-semibold mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          تنزيل المخرجات
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* ملف مصحح */}
          <button
            onClick={() => download('corrected')}
            disabled={downloading === 'corrected'}
            className="flex flex-col items-center gap-2 p-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 rounded-xl transition-all group disabled:opacity-60"
          >
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              {downloading === 'corrected' ? (
                <svg className="w-5 h-5 animate-spin text-green-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              )}
            </div>
            <div className="text-center">
              <p className="text-green-300 text-sm font-medium">البيانات المصحّحة</p>
              <p className="text-gray-500 text-xs mt-0.5">Excel — نفس القالب بعد التطبيع</p>
            </div>
          </button>

          {/* تقرير أخطاء Excel */}
          <button
            onClick={() => download('errors_excel')}
            disabled={downloading === 'errors_excel'}
            className="flex flex-col items-center gap-2 p-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 rounded-xl transition-all group disabled:opacity-60"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              {downloading === 'errors_excel' ? (
                <svg className="w-5 h-5 animate-spin text-orange-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              )}
            </div>
            <div className="text-center">
              <p className="text-orange-300 text-sm font-medium">تقرير الأخطاء</p>
              <p className="text-gray-500 text-xs mt-0.5">Excel — أخطاء + تحذيرات + تصحيحات</p>
            </div>
          </button>

          {/* تقرير JSON */}
          <button
            onClick={() => download('errors_json')}
            disabled={downloading === 'errors_json'}
            className="flex flex-col items-center gap-2 p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 rounded-xl transition-all group disabled:opacity-60"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              {downloading === 'errors_json' ? (
                <svg className="w-5 h-5 animate-spin text-purple-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                </svg>
              )}
            </div>
            <div className="text-center">
              <p className="text-purple-300 text-sm font-medium">تقرير JSON</p>
              <p className="text-gray-500 text-xs mt-0.5">للمطورين — نتيجة كل صف</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Navigation Buttons ── */}
      <div className="flex gap-3 justify-center flex-wrap">
        <button
          onClick={() => window.location.href = '/admin/stores'}
          className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 rounded-xl text-white font-medium transition-all text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          عرض المتاجر
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          استيراد جديد
        </button>
      </div>

    </div>
  );
}
