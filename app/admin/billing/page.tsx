'use client';

import { useState, useEffect, useCallback } from 'react';
import { Summary, Invoice, Commission, Bonus } from './_components/types';
import InvoicesTab from './_components/InvoicesTab';
import CommissionsTab from './_components/CommissionsTab';
import BonusesTab from './_components/BonusesTab';
import ReportsTab from './_components/ReportsTab';

function fmt(n: number) {
  return Number(n || 0).toLocaleString('ar-SA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildPeriodOptions() {
  const opts: string[] = [];
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() - 1);
  }
  return opts;
}

function periodLabel(p: string) {
  const [y, m] = p.split('-');
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  return `${months[Number(m) - 1]} ${y}`;
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <p className="text-xs opacity-60 mb-1">{label}</p>
      <p className="text-xl font-bold font-mono leading-tight">{value}</p>
      {sub && <p className="text-xs opacity-50 mt-1">{sub}</p>}
    </div>
  );
}

type TabKey = 'invoices' | 'commissions' | 'bonuses' | 'reports';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'invoices',    label: 'فواتير المتاجر' },
  { key: 'commissions', label: 'العمولات' },
  { key: 'bonuses',     label: 'البونص' },
  { key: 'reports',     label: 'التقارير' },
];

const INV_FILTERS  = [['','الكل'],['unpaid','غير مدفوع'],['partial','جزئي'],['paid','مدفوع'],['void','ملغي']];
const PAY_FILTERS  = [['','الكل'],['pending','معلق'],['approved','موافق'],['paid','مدفوع'],['canceled','ملغي']];

export default function BillingPage() {
  const [tab, setTab]                   = useState<TabKey>('invoices');
  const [period, setPeriod]             = useState(currentPeriod());
  const [summary, setSummary]           = useState<Summary | null>(null);
  const [invoices, setInvoices]         = useState<Invoice[]>([]);
  const [commissions, setCommissions]   = useState<Commission[]>([]);
  const [bonuses, setBonuses]           = useState<Bonus[]>([]);
  const [loading, setLoading]           = useState(true);
  const [generating, setGenerating]     = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId]     = useState<string | null>(null);

  const periodOptions = buildPeriodOptions();

  const fetchSummary = useCallback(async () => {
    const r = await fetch(`/api/billing/summary?period=${period}`);
    if (r.ok) setSummary(await r.json());
  }, [period]);

  const fetchInvoices = useCallback(async () => {
    const p = new URLSearchParams({ period, limit: '100' });
    if (statusFilter) p.set('status', statusFilter);
    const r = await fetch(`/api/billing/invoices?${p}`);
    if (r.ok) { const d = await r.json(); setInvoices(d.invoices || []); }
  }, [period, statusFilter]);

  const fetchCommissions = useCallback(async () => {
    const p = new URLSearchParams({ period, limit: '100' });
    if (statusFilter) p.set('status', statusFilter);
    const r = await fetch(`/api/billing/commissions?${p}`);
    if (r.ok) { const d = await r.json(); setCommissions(d.commissions || []); }
  }, [period, statusFilter]);

  const fetchBonuses = useCallback(async () => {
    const p = new URLSearchParams({ period, limit: '100' });
    if (statusFilter) p.set('status', statusFilter);
    const r = await fetch(`/api/billing/bonuses?${p}`);
    if (r.ok) { const d = await r.json(); setBonuses(d.bonuses || []); }
  }, [period, statusFilter]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchSummary(), fetchInvoices(), fetchCommissions(), fetchBonuses()]);
    setLoading(false);
  }, [fetchSummary, fetchInvoices, fetchCommissions, fetchBonuses]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const r = await fetch('/api/billing/generate-monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const d = await r.json();
      alert(`تم توليد ${d.generated} فاتورة، تخطي ${d.skipped}`);
      fetchAll();
    } finally { setGenerating(false); }
  };

  const patchInvoice = async (id: string, status: string) => {
    setUpdatingId(id);
    await fetch('/api/billing/invoices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    setUpdatingId(null); fetchAll();
  };

  const patchCommission = async (id: string, status: string) => {
    setUpdatingId(id);
    await fetch('/api/billing/commissions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    setUpdatingId(null); fetchAll();
  };

  const patchBonus = async (id: string, status: string) => {
    setUpdatingId(id);
    await fetch('/api/billing/bonuses', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    setUpdatingId(null); fetchAll();
  };

  const activeFilters = tab === 'invoices' ? INV_FILTERS : PAY_FILTERS;

  return (
    <div className="min-h-screen bg-[#0a0118] p-4 md:p-6" dir="rtl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
            الفوترة
          </h1>
          <p className="text-purple-400/60 text-sm mt-0.5">إدارة الفواتير والعمولات والبونص</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={period}
            onChange={e => { setPeriod(e.target.value); setStatusFilter(''); }}
            className="px-3 py-2 bg-purple-900/30 border border-purple-500/30 text-white rounded-xl text-sm focus:outline-none focus:border-purple-400"
          >
            {periodOptions.map(p => (
              <option key={p} value={p} className="bg-[#1a0a2e]">{periodLabel(p)}</option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            )}
            توليد الفواتير
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <KpiCard
            label="إجمالي المدفوعات"
            value={`${fmt(summary.invoices.total_paid)} ر.س`}
            sub={`${summary.invoices.count} فاتورة`}
            color="bg-green-500/10 border-green-500/20 text-green-300"
          />
          <KpiCard
            label="غير مدفوع"
            value={`${fmt(summary.invoices.total_unpaid)} ر.س`}
            color="bg-red-500/10 border-red-500/20 text-red-300"
          />
          <KpiCard
            label="إجمالي العمولات"
            value={`${fmt(summary.commissions.total)} ر.س`}
            sub={`مدفوع: ${fmt(summary.commissions.paid)}`}
            color="bg-blue-500/10 border-blue-500/20 text-blue-300"
          />
          <KpiCard
            label="إجمالي البونص"
            value={`${fmt(summary.bonuses.total)} ر.س`}
            color="bg-purple-500/10 border-purple-500/20 text-purple-300"
          />
          <KpiCard
            label="صافي الإيراد"
            value={`${fmt(summary.net_revenue)} ر.س`}
            sub="بعد العمولات والبونص"
            color="bg-amber-500/10 border-amber-500/20 text-amber-300"
          />
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-4 bg-purple-900/20 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setStatusFilter(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-purple-600 text-white shadow'
                : 'text-purple-400 hover:text-white hover:bg-purple-500/20'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Status Filter ── */}
      {tab !== 'reports' && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {activeFilters.map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                statusFilter === val
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-purple-900/20 border-purple-500/20 text-purple-400 hover:border-purple-400'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-purple-950/30 rounded-2xl border border-purple-500/20 overflow-hidden">
          {tab === 'invoices' && (
            <InvoicesTab
              invoices={invoices}
              updatingId={updatingId}
              onPatch={patchInvoice}
              onGenerate={handleGenerate}
            />
          )}
          {tab === 'commissions' && (
            <CommissionsTab
              commissions={commissions}
              updatingId={updatingId}
              onPatch={patchCommission}
            />
          )}
          {tab === 'bonuses' && (
            <BonusesTab
              bonuses={bonuses}
              updatingId={updatingId}
              onPatch={patchBonus}
            />
          )}
          {tab === 'reports' && summary && (
            <div className="p-4">
              <ReportsTab summary={summary} period={period} />
            </div>
          )}
          {tab === 'reports' && !summary && (
            <div className="text-center py-16 text-purple-400/50">لا توجد بيانات لهذه الفترة</div>
          )}
        </div>
      )}
    </div>
  );
}
