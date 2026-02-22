'use client';

import { useState, useCallback } from 'react';
import { PAY_STATUS, fmt } from './types';
import { Badge } from './Badge';

/* ── نافذة البيانات البنكية ─────────────────────────────────── */
interface BankEmployee {
  name: string;
  bank_name?: string | null;
  bank_iban?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);
  return (
    <button
      onClick={copy}
      title="نسخ"
      className={`p-1 rounded-lg transition-all ${
        copied
          ? 'bg-green-500/20 text-green-400'
          : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-white'
      }`}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

function BankModal({ emp, onClose }: { emp: BankEmployee; onClose: () => void }) {
  const rows = [
    { icon: '🏦', label: 'اسم البنك',          value: emp.bank_name,           mono: false },
    { icon: '👤', label: 'اسم صاحب الحساب',    value: emp.bank_account_name,   mono: false },
    { icon: '💳', label: 'رقم الآيبان (IBAN)', value: emp.bank_iban,           mono: true  },
    { icon: '🔢', label: 'رقم الحساب',         value: emp.bank_account_number, mono: true  },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#130828] border border-blue-500/30 rounded-2xl w-full max-w-md shadow-2xl shadow-blue-900/30"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-lg">🏦</div>
            <div>
              <p className="text-white font-semibold">{emp.name}</p>
              <p className="text-blue-400/60 text-xs">البيانات البنكية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-white transition-all flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          {rows.map(row => (
            <div key={row.label} className="flex items-center gap-3 bg-purple-900/20 rounded-xl px-4 py-3 border border-purple-500/10">
              <span className="text-xl flex-shrink-0">{row.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-purple-400/60 text-xs mb-0.5">{row.label}</p>
                {row.value ? (
                  <p className={`text-white text-sm break-all ${row.mono ? 'font-mono' : 'font-medium'}`}>
                    {row.value}
                  </p>
                ) : (
                  <p className="text-purple-400/30 text-xs">غير محدد</p>
                )}
              </div>
              {row.value && <CopyBtn text={row.value} />}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 rounded-xl text-sm transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

export interface Salary {
  id: string;
  employee_id: string;
  period: string;
  base_salary: number;
  deductions: number;
  additions: number;
  net_salary: number;
  status: 'pending' | 'approved' | 'paid' | 'canceled';
  notes: string | null;
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
  employee: {
    id: string; name: string; username: string; role: string; avatar?: string;
    bank_name?: string | null;
    bank_iban?: string | null;
    bank_account_name?: string | null;
    bank_account_number?: string | null;
  } | null;
}

interface EditRow {
  id: string;
  deductions: string;
  additions: string;
  notes: string;
}

interface Props {
  salaries: Salary[];
  updatingId: string | null;
  onPatch: (id: string, data: { status?: string; deductions?: number; additions?: number; notes?: string }) => void;
  onGenerate: () => void;
}

const ROLE_NAMES: Record<string, string> = {
  super_admin: 'المسؤول الرئيسي',
  admin: 'المسؤول',
  owner: 'المالك',
  team_leader: 'قائد فريق',
  account_manager: 'مدير حساب',
  media_buyer: 'ميديا باير',
  programmer: 'مبرمج',
  designer: 'مصمم',
  web_developer: 'مطور ويب',
  general_manager: 'المدير العام',
  manager: 'مدير',
};

export default function SalariesTab({ salaries, updatingId, onPatch, onGenerate }: Props) {
  const [editRow, setEditRow]       = useState<EditRow | null>(null);
  const [bankModal, setBankModal]   = useState<BankEmployee | null>(null);

  const startEdit = (s: Salary) => {
    setEditRow({
      id: s.id,
      deductions: String(s.deductions || 0),
      additions:  String(s.additions  || 0),
      notes:      s.notes || '',
    });
  };

  const saveEdit = () => {
    if (!editRow) return;
    onPatch(editRow.id, {
      deductions: Number(editRow.deductions) || 0,
      additions:  Number(editRow.additions)  || 0,
      notes:      editRow.notes,
    });
    setEditRow(null);
  };

  const totalBase = salaries.reduce((s, r) => s + Number(r.base_salary), 0);
  const totalNet  = salaries.reduce((s, r) => s + Number(r.net_salary),  0);
  const totalPaid = salaries.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.net_salary), 0);
  const countPaid = salaries.filter(r => r.status === 'paid').length;

  if (salaries.length === 0) {
    return (
      <div className="text-center py-16 text-purple-400/50">
        <div className="text-5xl mb-3">💰</div>
        <p className="text-white/60 mb-1">لا توجد رواتب لهذه الفترة</p>
        <p className="text-xs opacity-50 mb-4">يجب أن يكون للموظف راتب شهري محدد في ملفه الشخصي</p>
        <button
          onClick={onGenerate}
          className="px-5 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-sm hover:bg-amber-500/30 transition-all font-medium"
        >
          ⚡ توليد رواتب هذا الشهر
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* ── ملخص سريع ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-purple-500/20">
        {[
          { label: 'إجمالي الرواتب الأساسية', value: `${fmt(totalBase)} ر.س`, cls: 'text-purple-300' },
          { label: 'إجمالي الصافي',            value: `${fmt(totalNet)} ر.س`,  cls: 'text-white' },
          { label: 'تم الصرف',                 value: `${fmt(totalPaid)} ر.س`, cls: 'text-green-300' },
          { label: 'عدد المصروفين',             value: `${countPaid} / ${salaries.length}`, cls: 'text-amber-300' },
        ].map(item => (
          <div key={item.label} className="bg-purple-900/20 rounded-xl p-3 border border-purple-500/10">
            <p className="text-purple-400/60 text-xs mb-1">{item.label}</p>
            <p className={`font-mono font-bold text-sm ${item.cls}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* ── الجدول ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-purple-500/20 text-purple-400/70 text-xs">
              {['الموظف', 'الدور', 'الأساسي', 'الخصومات', 'الإضافات', 'الصافي', 'البنك', 'الحالة', 'إجراء'].map(h => (
                <th key={h} className="text-right px-4 py-3 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-500/10">
            {salaries.map(s => {
              const isEditing = editRow?.id === s.id;
              return (
                <tr key={s.id} className={`hover:bg-purple-500/5 transition-colors ${isEditing ? 'bg-purple-900/20' : ''}`}>
                  {/* الموظف */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {s.employee?.avatar ? (
                        <img src={s.employee.avatar} className="w-7 h-7 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-purple-700/50 flex items-center justify-center text-xs font-bold text-purple-200">
                          {s.employee?.name?.charAt(0) || '?'}
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium whitespace-nowrap">{s.employee?.name || '—'}</p>
                        <p className="text-purple-400/50 text-xs">@{s.employee?.username}</p>
                      </div>
                    </div>
                  </td>

                  {/* الدور */}
                  <td className="px-4 py-3 text-purple-300 text-xs whitespace-nowrap">
                    {ROLE_NAMES[s.employee?.role || ''] || s.employee?.role || '—'}
                  </td>

                  {/* الأساسي */}
                  <td className="px-4 py-3 font-mono text-white whitespace-nowrap">{fmt(s.base_salary)} ر.س</td>

                  {/* الخصومات */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editRow.deductions}
                        onChange={e => setEditRow({ ...editRow, deductions: e.target.value })}
                        className="w-24 bg-red-900/20 border border-red-500/30 rounded-lg px-2 py-1 text-red-300 text-xs font-mono focus:outline-none focus:border-red-400"
                        min="0"
                      />
                    ) : (
                      <span className={`font-mono text-xs ${s.deductions > 0 ? 'text-red-400' : 'text-purple-400/40'}`}>
                        {s.deductions > 0 ? `- ${fmt(s.deductions)}` : '—'}
                      </span>
                    )}
                  </td>

                  {/* الإضافات */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editRow.additions}
                        onChange={e => setEditRow({ ...editRow, additions: e.target.value })}
                        className="w-24 bg-green-900/20 border border-green-500/30 rounded-lg px-2 py-1 text-green-300 text-xs font-mono focus:outline-none focus:border-green-400"
                        min="0"
                      />
                    ) : (
                      <span className={`font-mono text-xs ${s.additions > 0 ? 'text-green-400' : 'text-purple-400/40'}`}>
                        {s.additions > 0 ? `+ ${fmt(s.additions)}` : '—'}
                      </span>
                    )}
                  </td>

                  {/* الصافي */}
                  <td className="px-4 py-3 font-mono font-bold text-amber-300 whitespace-nowrap">
                    {fmt(s.net_salary)} ر.س
                  </td>

                  {/* البيانات البنكية */}
                  <td className="px-4 py-3">
                    {s.employee?.bank_name || s.employee?.bank_iban ? (
                      <button
                        onClick={() => setBankModal(s.employee!)}
                        className="group text-right hover:bg-blue-500/10 rounded-xl px-2 py-1 transition-all border border-transparent hover:border-blue-500/20"
                      >
                        <p className="text-blue-300 text-xs font-medium whitespace-nowrap group-hover:text-blue-200 flex items-center gap-1">
                          {s.employee.bank_name || '—'}
                          <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </p>
                        {s.employee.bank_iban && (
                          <p className="text-blue-400/50 text-xs font-mono mt-0.5 whitespace-nowrap">
                            {s.employee.bank_iban.length > 10
                              ? s.employee.bank_iban.slice(0, 4) + '••••' + s.employee.bank_iban.slice(-4)
                              : s.employee.bank_iban}
                          </p>
                        )}
                      </button>
                    ) : (
                      <span className="text-purple-400/30 text-xs">غير محدد</span>
                    )}
                  </td>

                  {/* الحالة */}
                  <td className="px-4 py-3"><Badge status={s.status} map={PAY_STATUS} /></td>

                  {/* الإجراء */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button
                          onClick={saveEdit}
                          disabled={updatingId === s.id}
                          className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded-lg text-xs disabled:opacity-50"
                        >حفظ</button>
                        <button
                          onClick={() => setEditRow(null)}
                          className="px-2 py-1 bg-gray-500/15 hover:bg-gray-500/25 border border-gray-500/20 text-gray-400 rounded-lg text-xs"
                        >إلغاء</button>
                      </div>
                    ) : (
                      <div className="flex gap-1 flex-wrap">
                        {s.status === 'pending' && (
                          <>
                            <button
                              onClick={() => startEdit(s)}
                              className="px-2 py-1 bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/20 text-purple-300 rounded-lg text-xs"
                            >تعديل</button>
                            <button
                              onClick={() => onPatch(s.id, { status: 'approved' })}
                              disabled={updatingId === s.id}
                              className="px-2 py-1 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 text-blue-400 rounded-lg text-xs disabled:opacity-50"
                            >موافقة</button>
                            <button
                              onClick={() => onPatch(s.id, { status: 'canceled' })}
                              disabled={updatingId === s.id}
                              className="px-2 py-1 bg-gray-500/15 hover:bg-gray-500/25 border border-gray-500/20 text-gray-400 rounded-lg text-xs disabled:opacity-50"
                            >إلغاء</button>
                          </>
                        )}
                        {s.status === 'approved' && (
                          <button
                            onClick={() => onPatch(s.id, { status: 'paid' })}
                            disabled={updatingId === s.id}
                            className="px-2 py-1 bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-400 rounded-lg text-xs disabled:opacity-50 whitespace-nowrap"
                          >✓ صرف الراتب</button>
                        )}
                        {s.status === 'paid' && (
                          <span className="text-green-400/60 text-xs whitespace-nowrap">
                            ✓ {s.paid_at ? new Date(s.paid_at).toLocaleDateString('ar-SA') : ''}
                          </span>
                        )}
                        {s.status === 'canceled' && (
                          <span className="text-gray-500 text-xs">ملغي</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── نافذة البيانات البنكية ── */}
      {bankModal && <BankModal emp={bankModal} onClose={() => setBankModal(null)} />}
    </div>
  );
}
