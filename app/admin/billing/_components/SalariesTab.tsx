'use client';

import { useState } from 'react';
import { PAY_STATUS, fmt } from './types';
import { Badge } from './Badge';

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
  employee: { id: string; name: string; username: string; role: string; avatar?: string } | null;
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
  const [editRow, setEditRow] = useState<EditRow | null>(null);

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
              {['الموظف', 'الدور', 'الأساسي', 'الخصومات', 'الإضافات', 'الصافي', 'الحالة', 'إجراء'].map(h => (
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
    </div>
  );
}
