'use client';

import { Commission, PAY_STATUS, fmt } from './types';
import { Badge } from './Badge';

interface Props {
  commissions: Commission[];
  updatingId: string | null;
  onPatch: (id: string, status: string) => void;
}

export default function CommissionsTab({ commissions, updatingId, onPatch }: Props) {
  if (commissions.length === 0) {
    return (
      <div className="text-center py-16 text-purple-400/50">
        <p>لا توجد عمولات لهذه الفترة</p>
        <p className="text-xs mt-1 opacity-60">العمولات تُولد تلقائياً عند دفع الفاتورة</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-purple-500/20 text-purple-400/70 text-xs">
            {['الموظف', 'المتجر', 'الفاتورة', 'المبلغ الأساسي', 'العمولة', 'الحالة', 'إجراء'].map(h => (
              <th key={h} className="text-right px-4 py-3 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-purple-500/10">
          {commissions.map(c => (
            <tr key={c.id} className="hover:bg-purple-500/5 transition-colors">
              <td className="px-4 py-3">
                <p className="text-white font-medium">{c.employee?.name || '—'}</p>
                <p className="text-purple-400/50 text-xs">@{c.employee?.username}</p>
              </td>
              <td className="px-4 py-3 text-purple-300 whitespace-nowrap">{c.store?.store_name || '—'}</td>
              <td className="px-4 py-3 font-mono text-xs text-purple-400 whitespace-nowrap">{c.invoice?.invoice_number || '—'}</td>
              <td className="px-4 py-3 font-mono text-white whitespace-nowrap">{fmt(c.base_amount)} ر.س</td>
              <td className="px-4 py-3 font-mono font-bold text-blue-300 whitespace-nowrap">{fmt(c.commission_amount)} ر.س</td>
              <td className="px-4 py-3"><Badge status={c.status} map={PAY_STATUS} /></td>
              <td className="px-4 py-3">
                {c.status === 'pending' && (
                  <div className="flex gap-1">
                    <button onClick={() => onPatch(c.id, 'approved')} disabled={updatingId === c.id}
                      className="px-2 py-1 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 text-blue-400 rounded-lg text-xs disabled:opacity-50">موافقة</button>
                    <button onClick={() => onPatch(c.id, 'canceled')} disabled={updatingId === c.id}
                      className="px-2 py-1 bg-gray-500/15 hover:bg-gray-500/25 border border-gray-500/20 text-gray-400 rounded-lg text-xs disabled:opacity-50">إلغاء</button>
                  </div>
                )}
                {c.status === 'approved' && (
                  <button onClick={() => onPatch(c.id, 'paid')} disabled={updatingId === c.id}
                    className="px-2 py-1 bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-400 rounded-lg text-xs disabled:opacity-50">صرف</button>
                )}
                {c.status === 'paid' && (
                  <span className="text-green-400/60 text-xs whitespace-nowrap">✓ {c.paid_at ? new Date(c.paid_at).toLocaleDateString('ar-SA') : ''}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
