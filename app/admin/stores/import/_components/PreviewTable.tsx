'use client';
import { useState } from 'react';

export interface ImportRow {
  id: string; row_index: number;
  status: 'valid' | 'warning' | 'error' | 'committed' | 'skipped' | 'pending';
  expected_action?: 'insert' | 'update' | 'skip';
  normalized_row: Record<string, unknown> | null;
  errors: { field: string; message: string; value?: string }[];
  warnings: { field: string; message: string; value?: string }[];
  autofixes: { field: string; action: string; old_value: string; new_value: string }[];
}

const SC: Record<string, { label: string; color: string; bg: string }> = {
  valid:     { label: 'صالح',   color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30'   },
  warning:   { label: 'تحذير',  color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  error:     { label: 'خطأ',    color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30'       },
  committed: { label: 'محفوظ',  color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30'     },
  skipped:   { label: 'متجاهل', color: 'text-gray-400',   bg: 'bg-gray-500/10 border-gray-500/20'     },
};
const AC: Record<string, { label: string; color: string }> = {
  insert: { label: 'إضافة جديدة', color: 'text-green-400' },
  update: { label: 'تحديث',       color: 'text-blue-400'  },
  skip:   { label: 'تجاهل',       color: 'text-gray-400'  },
};

interface Props { rows: ImportRow[]; loading: boolean; }

export default function PreviewTable({ rows, loading }: Props) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="bg-white/3 border border-white/10 rounded-2xl flex items-center justify-center py-20">
        <svg className="w-8 h-8 animate-spin text-purple-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white/3 border border-white/10 rounded-2xl flex items-center justify-center py-16">
        <p className="text-gray-500">لا توجد صفوف تطابق الفلتر المحدد</p>
      </div>
    );
  }

  return (
    <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/3">
              {['#', 'الحالة', 'الإجراء', 'رابط المتجر', 'اسم المتجر', 'الجوال', 'الأولوية', 'الحالة', ''].map((h, i) => (
                <th key={i} className="text-right px-4 py-3 text-gray-400 font-medium whitespace-nowrap text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const sc = SC[row.status] ?? SC.valid;
              const ac = row.expected_action ? AC[row.expected_action] : null;
              const n  = row.normalized_row ?? {};
              const isExp = expandedRow === row.id;
              const hasIssues = row.errors.length > 0 || row.warnings.length > 0 || row.autofixes.length > 0;

              return (
                <>
                  <tr key={row.id} className={`border-b border-white/5 hover:bg-white/3 transition-colors ${isExp ? 'bg-white/3' : ''}`}>
                    <td className="px-4 py-3 text-gray-500 text-xs">{row.row_index}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sc.bg} ${sc.color}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ac && <span className={`text-xs font-medium ${ac.color}`}>{ac.label}</span>}
                    </td>
                    <td className="px-4 py-3 text-purple-300 text-xs font-mono max-w-[160px] truncate" dir="ltr">
                      {String(n.store_url ?? '')}
                    </td>
                    <td className="px-4 py-3 text-white text-xs max-w-[140px] truncate">
                      {String(n.store_name ?? '')}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs" dir="ltr">
                      {String(n.owner_phone ?? '')}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={n.priority === 'high' ? 'text-red-400' : n.priority === 'low' ? 'text-green-400' : 'text-yellow-400'}>
                        {String(n.priority ?? '')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{String(n.status ?? '')}</td>
                    <td className="px-4 py-3">
                      {hasIssues && (
                        <button onClick={() => setExpandedRow(isExp ? null : row.id)}
                          className="text-gray-500 hover:text-white transition-colors p-1">
                          <svg className={`w-4 h-4 transition-transform ${isExp ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>

                  {isExp && (
                    <tr key={`${row.id}-exp`} className="border-b border-white/5 bg-[#0a0318]">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="space-y-3">
                          {/* Errors */}
                          {row.errors.length > 0 && (
                            <div>
                              <p className="text-red-400 text-xs font-semibold mb-2">أخطاء ({row.errors.length})</p>
                              <div className="space-y-1">
                                {row.errors.map((e, i) => (
                                  <div key={i} className="flex items-start gap-2 text-xs">
                                    <span className="text-red-500 shrink-0 mt-0.5">✗</span>
                                    <span className="text-red-300">
                                      <span className="font-medium text-red-400">{e.field}</span>: {e.message}
                                      {e.value ? <span className="text-red-500 mr-1">({e.value})</span> : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Warnings */}
                          {row.warnings.length > 0 && (
                            <div>
                              <p className="text-yellow-400 text-xs font-semibold mb-2">تحذيرات ({row.warnings.length})</p>
                              <div className="space-y-1">
                                {row.warnings.map((w, i) => (
                                  <div key={i} className="flex items-start gap-2 text-xs">
                                    <span className="text-yellow-500 shrink-0 mt-0.5">⚠</span>
                                    <span className="text-yellow-300">
                                      <span className="font-medium text-yellow-400">{w.field}</span>: {w.message}
                                      {w.value ? <span className="text-yellow-500 mr-1">({w.value})</span> : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Autofixes */}
                          {row.autofixes.length > 0 && (
                            <div>
                              <p className="text-blue-400 text-xs font-semibold mb-2">تصحيحات تلقائية ({row.autofixes.length})</p>
                              <div className="space-y-1">
                                {row.autofixes.map((f, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs flex-wrap">
                                    <span className="text-blue-500 shrink-0">✎</span>
                                    <span className="text-blue-300 font-medium">{f.field}</span>
                                    <span className="text-gray-500 line-through">{f.old_value}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-green-300">{f.new_value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
