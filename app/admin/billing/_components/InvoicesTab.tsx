'use client';

import { Invoice, INV_STATUS, fmt } from './types';
import { Badge } from './Badge';

interface Props {
  invoices: Invoice[];
  updatingId: string | null;
  onPatch: (id: string, status: string) => void;
  onGenerate: () => void;
}

export default function InvoicesTab({ invoices, updatingId, onPatch, onGenerate }: Props) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-16 text-purple-400/50">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
        <p>لا توجد فواتير لهذه الفترة</p>
        <button onClick={onGenerate} className="mt-3 px-4 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-sm hover:bg-amber-500/30 transition-all">
          توليد الفواتير
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-purple-500/20 text-purple-400/70 text-xs">
            {['رقم الفاتورة', 'المتجر', 'المبلغ', 'الضريبة', 'الإجمالي', 'تاريخ الإصدار', 'الاستحقاق', 'الحالة', 'إجراء'].map(h => (
              <th key={h} className="text-right px-4 py-3 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-purple-500/10">
          {invoices.map(inv => (
            <tr key={inv.id} className="hover:bg-purple-500/5 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-purple-300 whitespace-nowrap">{inv.invoice_number || '—'}</td>
              <td className="px-4 py-3">
                <p className="text-white font-medium whitespace-nowrap">{inv.store?.store_name || '—'}</p>
                <p className="text-purple-400/50 text-xs">{inv.store?.owner_name}</p>
              </td>
              <td className="px-4 py-3 font-mono text-white whitespace-nowrap">{fmt(inv.amount)}</td>
              <td className="px-4 py-3 font-mono text-purple-400 whitespace-nowrap">{fmt(inv.vat_amount)}</td>
              <td className="px-4 py-3 font-mono font-bold text-amber-300 whitespace-nowrap">{fmt(inv.total_amount)} ر.س</td>
              <td className="px-4 py-3 text-purple-300 text-xs whitespace-nowrap">
                {new Date(inv.issue_date).toLocaleDateString('ar-SA')}
              </td>
              <td className="px-4 py-3 text-purple-300 text-xs whitespace-nowrap">
                {inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-SA') : '—'}
              </td>
              <td className="px-4 py-3"><Badge status={inv.status} map={INV_STATUS} /></td>
              <td className="px-4 py-3">
                {inv.status !== 'paid' && inv.status !== 'void' && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => onPatch(inv.id, 'paid')}
                      disabled={updatingId === inv.id}
                      className="px-2 py-1 bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-400 rounded-lg text-xs transition-all disabled:opacity-50 whitespace-nowrap"
                    >دفع</button>
                    <button
                      onClick={() => onPatch(inv.id, 'void')}
                      disabled={updatingId === inv.id}
                      className="px-2 py-1 bg-gray-500/15 hover:bg-gray-500/25 border border-gray-500/20 text-gray-400 rounded-lg text-xs transition-all disabled:opacity-50"
                    >إلغاء</button>
                  </div>
                )}
                {inv.status === 'paid' && (
                  <span className="text-green-400/60 text-xs whitespace-nowrap">
                    ✓ {inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('ar-SA') : ''}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
