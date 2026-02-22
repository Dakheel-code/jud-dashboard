'use client';

import { Bonus, PAY_STATUS, fmt } from './types';
import { Badge } from './Badge';

interface Props {
  bonuses: Bonus[];
  updatingId: string | null;
  onPatch: (id: string, status: string) => void;
}

export default function BonusesTab({ bonuses, updatingId, onPatch }: Props) {
  if (bonuses.length === 0) {
    return (
      <div className="text-center py-16 text-purple-400/50">
        <p>لا يوجد بونص لهذه الفترة</p>
        <p className="text-xs mt-1 opacity-60">البونص يُحسب شهرياً من مجموع العمولات</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-purple-500/20 text-purple-400/70 text-xs">
            {['الموظف', 'القاعدة', 'المبلغ الأساسي', 'البونص', 'الحالة', 'إجراء'].map(h => (
              <th key={h} className="text-right px-4 py-3 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-purple-500/10">
          {bonuses.map(b => (
            <tr key={b.id} className="hover:bg-purple-500/5 transition-colors">
              <td className="px-4 py-3">
                <p className="text-white font-medium">{b.employee?.name || '—'}</p>
                <p className="text-purple-400/50 text-xs">@{b.employee?.username}</p>
              </td>
              <td className="px-4 py-3">
                <p className="text-purple-300">{b.rule?.name || '—'}</p>
                <p className="text-purple-400/50 text-xs">
                  {b.rule?.rate_type === 'percentage'
                    ? `${b.rule.rate_value}%`
                    : `${fmt(b.rule?.rate_value || 0)} ر.س ثابت`}
                </p>
              </td>
              <td className="px-4 py-3 font-mono text-white whitespace-nowrap">{fmt(b.base_value)} ر.س</td>
              <td className="px-4 py-3 font-mono font-bold text-purple-300 whitespace-nowrap">{fmt(b.bonus_amount)} ر.س</td>
              <td className="px-4 py-3"><Badge status={b.status} map={PAY_STATUS} /></td>
              <td className="px-4 py-3">
                {b.status === 'pending' && (
                  <div className="flex gap-1">
                    <button onClick={() => onPatch(b.id, 'approved')} disabled={updatingId === b.id}
                      className="px-2 py-1 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 text-blue-400 rounded-lg text-xs disabled:opacity-50">موافقة</button>
                    <button onClick={() => onPatch(b.id, 'canceled')} disabled={updatingId === b.id}
                      className="px-2 py-1 bg-gray-500/15 hover:bg-gray-500/25 border border-gray-500/20 text-gray-400 rounded-lg text-xs disabled:opacity-50">إلغاء</button>
                  </div>
                )}
                {b.status === 'approved' && (
                  <button onClick={() => onPatch(b.id, 'paid')} disabled={updatingId === b.id}
                    className="px-2 py-1 bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-400 rounded-lg text-xs disabled:opacity-50">صرف</button>
                )}
                {b.status === 'paid' && (
                  <span className="text-green-400/60 text-xs whitespace-nowrap">✓ {b.paid_at ? new Date(b.paid_at).toLocaleDateString('ar-SA') : ''}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
