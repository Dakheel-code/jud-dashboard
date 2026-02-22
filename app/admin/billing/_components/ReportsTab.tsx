'use client';

import { Summary, fmt } from './types';

interface Props {
  summary: Summary;
  period: string;
}

function periodLabel(p: string) {
  const [y, m] = p.split('-');
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  return `${months[Number(m) - 1]} ${y}`;
}

function Row({ label, value, cls = 'text-white' }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-purple-500/10 last:border-0">
      <span className="text-purple-400/70 text-sm">{label}</span>
      <span className={`font-mono font-bold text-sm ${cls}`}>{value}</span>
    </div>
  );
}

export default function ReportsTab({ summary, period }: Props) {
  const collectionRate = summary.invoices.total_paid + summary.invoices.total_unpaid > 0
    ? Math.round((summary.invoices.total_paid / (summary.invoices.total_paid + summary.invoices.total_unpaid)) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* ملخص الفواتير */}
      <div className="bg-purple-950/30 rounded-2xl border border-purple-500/20 p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          ملخص الفواتير — {periodLabel(period)}
        </h3>
        <Row label="عدد الفواتير"       value={`${summary.invoices.count} فاتورة`} />
        <Row label="إجمالي المدفوعات"   value={`${fmt(summary.invoices.total_paid)} ر.س`}   cls="text-green-300" />
        <Row label="إجمالي غير المدفوع" value={`${fmt(summary.invoices.total_unpaid)} ر.س`} cls="text-red-300" />
        <Row label="الملغي"             value={`${fmt(summary.invoices.total_void)} ر.س`}   cls="text-gray-400" />
        <div className="mt-4 pt-3 border-t border-purple-500/20">
          <div className="flex items-center justify-between mb-1">
            <span className="text-purple-400/70 text-xs">نسبة التحصيل</span>
            <span className="text-amber-300 font-bold text-sm">{collectionRate}%</span>
          </div>
          <div className="w-full h-2 bg-purple-900/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-green-500 rounded-full transition-all"
              style={{ width: `${collectionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* ملخص العمولات والبونص */}
      <div className="bg-purple-950/30 rounded-2xl border border-purple-500/20 p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          العمولات والبونص — {periodLabel(period)}
        </h3>
        <Row label="إجمالي العمولات"    value={`${fmt(summary.commissions.total)} ر.س`}   cls="text-blue-300" />
        <Row label="عمولات مدفوعة"      value={`${fmt(summary.commissions.paid)} ر.س`}    cls="text-green-300" />
        <Row label="عمولات معلقة"       value={`${fmt(summary.commissions.pending)} ر.س`} cls="text-yellow-300" />
        <Row label="إجمالي البونص"      value={`${fmt(summary.bonuses.total)} ر.س`}       cls="text-purple-300" />
        <div className="mt-4 pt-3 border-t border-purple-500/20">
          <Row label="إجمالي الالتزامات" value={`${fmt(summary.commissions.total + summary.bonuses.total)} ر.س`} cls="text-red-300" />
        </div>
      </div>

      {/* صافي الإيراد */}
      <div className="md:col-span-2 bg-gradient-to-r from-amber-500/10 to-green-500/10 rounded-2xl border border-amber-500/20 p-5">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          الصافي — {periodLabel(period)}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'إجمالي المدفوعات',   value: fmt(summary.invoices.total_paid),                              cls: 'text-green-300' },
            { label: 'العمولات',            value: `- ${fmt(summary.commissions.total)}`,                         cls: 'text-red-300' },
            { label: 'البونص',              value: `- ${fmt(summary.bonuses.total)}`,                             cls: 'text-red-300' },
            { label: 'صافي الإيراد',        value: fmt(summary.net_revenue),                                      cls: summary.net_revenue >= 0 ? 'text-amber-300' : 'text-red-400' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="text-purple-400/60 text-xs mb-1">{item.label}</p>
              <p className={`font-mono font-bold text-lg ${item.cls}`}>{item.value}</p>
              <p className="text-purple-400/40 text-xs">ر.س</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
