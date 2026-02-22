'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useBranding } from '@/contexts/BrandingContext';
import { Summary, Invoice, Commission, Bonus } from './_components/types';
import InvoicesTab from './_components/InvoicesTab';
import CommissionsTab from './_components/CommissionsTab';
import BonusesTab from './_components/BonusesTab';
import ReportsTab from './_components/ReportsTab';
import SalariesTab, { Salary } from './_components/SalariesTab';

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

interface KpiProps {
  label: string; value: string; sub?: string;
  icon: string; gradient: string; border: string;
  badge?: { text: string; cls: string };
}
function KpiCard({ label, value, sub, icon, gradient, border, badge }: KpiProps) {
  return (
    <div className={`relative rounded-2xl border p-4 overflow-hidden ${gradient} ${border}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {badge && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>{badge.text}</span>}
      </div>
      <p className="text-xs opacity-60">{label}</p>
      <p className="text-xl font-bold font-mono leading-tight mt-0.5">{value}</p>
      {sub && <p className="text-xs opacity-50 mt-1">{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-purple-400/70">{label}</span>
        <span className="text-white font-bold">{value}%</span>
      </div>
      <div className="w-full h-2 bg-purple-900/40 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, cls }: { label: string; value: string | number; cls: string }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${cls}`}>
      <span className="text-xs opacity-70">{label}</span>
      <span className="font-mono font-bold text-sm">{value}</span>
    </div>
  );
}

type TabKey = 'invoices' | 'commissions' | 'bonuses' | 'salaries' | 'reports';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'invoices',    label: 'فواتير المتاجر', icon: '🧾' },
  { key: 'commissions', label: 'العمولات',        icon: '💼' },
  { key: 'bonuses',     label: 'البونص',           icon: '🎁' },
  { key: 'salaries',    label: 'الرواتب',          icon: '💰' },
  { key: 'reports',     label: 'التقارير',         icon: '📊' },
];

const INV_FILTERS  = [['','الكل'],['unpaid','غير مدفوع'],['partial','جزئي'],['paid','مدفوع'],['void','ملغي']];
const PAY_FILTERS  = [['','الكل'],['pending','معلق'],['approved','موافق'],['paid','مدفوع'],['canceled','ملغي']];

export default function BillingPage() {
  const { branding } = useBranding();
  const [tab, setTab]                   = useState<TabKey>('invoices');
  const [period, setPeriod]             = useState(currentPeriod());
  const [summary, setSummary]           = useState<Summary | null>(null);
  const [invoices, setInvoices]         = useState<Invoice[]>([]);
  const [commissions, setCommissions]   = useState<Commission[]>([]);
  const [bonuses, setBonuses]           = useState<Bonus[]>([]);
  const [salaries, setSalaries]         = useState<Salary[]>([]);
  const [loading, setLoading]           = useState(true);
  const [generating, setGenerating]     = useState(false);
  const [genSalaries, setGenSalaries]   = useState(false);
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

  const fetchSalaries = useCallback(async () => {
    const p = new URLSearchParams({ period });
    if (statusFilter) p.set('status', statusFilter);
    const r = await fetch(`/api/billing/salaries?${p}`);
    if (r.ok) { const d = await r.json(); setSalaries(d.salaries || []); }
  }, [period, statusFilter]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchSummary(), fetchInvoices(), fetchCommissions(), fetchBonuses(), fetchSalaries()]);
    setLoading(false);
  }, [fetchSummary, fetchInvoices, fetchCommissions, fetchBonuses, fetchSalaries]);

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

  const patchSalary = async (id: string, data: { status?: string; deductions?: number; additions?: number; notes?: string }) => {
    setUpdatingId(id);
    await fetch('/api/billing/salaries', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...data }) });
    setUpdatingId(null); fetchSalaries();
  };

  const handleGenerateSalaries = async () => {
    setGenSalaries(true);
    try {
      const r = await fetch('/api/billing/salaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });
      const d = await r.json();
      alert(`تم توليد ${d.generated} راتب، تخطي ${d.skipped} (موجود مسبقاً)`);
      fetchSalaries();
    } finally { setGenSalaries(false); }
  };

  const activeFilters = tab === 'invoices' ? INV_FILTERS : PAY_FILTERS;

  return (
    <div className="min-h-screen bg-[#0a0118] pb-20 lg:pb-8 relative overflow-hidden" dir="rtl">
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <img
            src={branding.logo || '/logo.png'}
            alt={branding.companyName || 'Logo'}
            className="w-14 h-14 sm:w-20 sm:h-20 object-contain"
          />
          <div className="h-12 sm:h-16 w-px bg-gradient-to-b from-transparent via-purple-400/50 to-transparent" />
          <div>
            <h1
              className="text-xl sm:text-3xl text-white mb-1 uppercase"
              style={{ fontFamily: "'Codec Pro', sans-serif", fontWeight: 900 }}
            >
              الفوترة
            </h1>
            <p className="text-purple-300/80 text-xs sm:text-sm">إدارة الفواتير والعمولات والبونص والرواتب</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={period}
            onChange={e => { setPeriod(e.target.value); setStatusFilter(''); }}
            className="px-3 py-2 bg-purple-900/50 border border-purple-500/30 text-white rounded-xl text-sm focus:outline-none focus:border-purple-400"
          >
            {periodOptions.map(p => (
              <option key={p} value={p} className="bg-slate-900">{periodLabel(p)}</option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          >
            {generating ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> : '⚡'}
            توليد الفواتير
          </button>
          <button
            onClick={handleGenerateSalaries}
            disabled={genSalaries}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          >
            {genSalaries ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> : '💰'}
            توليد الرواتب
          </button>
          <Link
            href="/admin"
            className="p-2.5 text-purple-400 border border-purple-500/30 hover:border-purple-400/50 hover:bg-purple-500/10 rounded-xl transition-all"
            title="لوحة التحكم"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
      </div>

      {/* ── KPIs ── */}
      {summary && (
        <div className="space-y-3 mb-6">

          {/* Row 1: الأرقام الرئيسية */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="إجمالي المحصّل"
              value={`${fmt(summary.invoices.total_paid)} ر.س`}
              sub={`${summary.invoices.count_paid} فاتورة مدفوعة`}
              icon="✅"
              gradient="bg-gradient-to-br from-green-900/40 to-green-800/10 text-green-300"
              border="border-green-500/25"
              badge={{ text: `${summary.invoices.collection_rate}% تحصيل`, cls: 'bg-green-500/20 text-green-300' }}
            />
            <KpiCard
              label="غير المحصّل"
              value={`${fmt(summary.invoices.total_unpaid)} ر.س`}
              sub={`${summary.invoices.count_unpaid + summary.invoices.count_partial} فاتورة معلقة`}
              icon="⚠️"
              gradient="bg-gradient-to-br from-red-900/40 to-red-800/10 text-red-300"
              border="border-red-500/25"
            />
            <KpiCard
              label="صافي الإيراد"
              value={`${fmt(summary.net_revenue)} ر.س`}
              sub={`هامش الربح ${summary.profit_margin}%`}
              icon="📈"
              gradient={`bg-gradient-to-br ${summary.net_revenue >= 0 ? 'from-amber-900/40 to-amber-800/10 text-amber-300' : 'from-red-900/40 to-red-800/10 text-red-300'}`}
              border={summary.net_revenue >= 0 ? 'border-amber-500/25' : 'border-red-500/25'}
              badge={{ text: summary.net_revenue >= 0 ? 'ربح' : 'خسارة', cls: summary.net_revenue >= 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300' }}
            />
            <KpiCard
              label="إجمالي الالتزامات"
              value={`${fmt(summary.expenses)} ر.س`}
              sub={`عمولات + بونص`}
              icon="💸"
              gradient="bg-gradient-to-br from-orange-900/40 to-orange-800/10 text-orange-300"
              border="border-orange-500/25"
            />
          </div>

          {/* Row 2: إحصائيات ثانوية + شريط التحصيل */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

            {/* شريط التحصيل */}
            <div className="lg:col-span-1 bg-purple-950/40 rounded-2xl border border-purple-500/20 p-4 space-y-3">
              <p className="text-purple-300 text-sm font-semibold">نسب الأداء</p>
              <ProgressBar
                label="نسبة التحصيل"
                value={summary.invoices.collection_rate}
                color="bg-gradient-to-r from-green-500 to-emerald-400"
              />
              <ProgressBar
                label="نسبة دفع العمولات"
                value={summary.commissions.total > 0 ? Math.round((summary.commissions.paid / summary.commissions.total) * 100) : 0}
                color="bg-gradient-to-r from-blue-500 to-cyan-400"
              />
              <ProgressBar
                label="نسبة دفع البونص"
                value={summary.bonuses.total > 0 ? Math.round((summary.bonuses.paid / summary.bonuses.total) * 100) : 0}
                color="bg-gradient-to-r from-purple-500 to-violet-400"
              />
            </div>

            {/* إحصائيات الفواتير */}
            <div className="bg-purple-950/40 rounded-2xl border border-purple-500/20 p-4">
              <p className="text-purple-300 text-sm font-semibold mb-3">إحصائيات الفواتير</p>
              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="إجمالي الفواتير" value={`${summary.invoices.count}`} cls="bg-purple-900/30 border-purple-500/20 text-purple-300" />
                <MiniStat label="متوسط الفاتورة" value={`${fmt(summary.invoices.avg_invoice)} ر.س`} cls="bg-purple-900/30 border-purple-500/20 text-purple-300" />
                <MiniStat label="مدفوعة" value={summary.invoices.count_paid} cls="bg-green-900/20 border-green-500/20 text-green-300" />
                <MiniStat label="غير مدفوعة" value={summary.invoices.count_unpaid} cls="bg-red-900/20 border-red-500/20 text-red-300" />
                <MiniStat label="جزئية" value={summary.invoices.count_partial} cls="bg-yellow-900/20 border-yellow-500/20 text-yellow-300" />
                <MiniStat label="ملغية" value={summary.invoices.count_void} cls="bg-gray-900/30 border-gray-500/20 text-gray-400" />
              </div>
            </div>

            {/* إحصائيات العمولات والبونص */}
            <div className="bg-purple-950/40 rounded-2xl border border-purple-500/20 p-4">
              <p className="text-purple-300 text-sm font-semibold mb-3">العمولات والبونص</p>
              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="إجمالي العمولات" value={`${fmt(summary.commissions.total)} ر.س`} cls="bg-blue-900/20 border-blue-500/20 text-blue-300" />
                <MiniStat label="عمولات مدفوعة" value={`${fmt(summary.commissions.paid)} ر.س`} cls="bg-green-900/20 border-green-500/20 text-green-300" />
                <MiniStat label="عمولات معلقة" value={`${fmt(summary.commissions.pending)} ر.س`} cls="bg-yellow-900/20 border-yellow-500/20 text-yellow-300" />
                <MiniStat label="موظفون" value={`${summary.commissions.unique_employees} موظف`} cls="bg-purple-900/30 border-purple-500/20 text-purple-300" />
                <MiniStat label="إجمالي البونص" value={`${fmt(summary.bonuses.total)} ر.س`} cls="bg-violet-900/20 border-violet-500/20 text-violet-300" />
                <MiniStat label="بونص مدفوع" value={`${fmt(summary.bonuses.paid)} ر.س`} cls="bg-green-900/20 border-green-500/20 text-green-300" />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-4 bg-purple-900/20 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setStatusFilter(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              tab === t.key
                ? 'bg-purple-600 text-white shadow'
                : 'text-purple-400 hover:text-white hover:bg-purple-500/20'
            }`}
          >
            <span>{t.icon}</span>{t.label}
            {t.key === 'invoices' && summary && summary.invoices.count_unpaid > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">{summary.invoices.count_unpaid}</span>
            )}
            {t.key === 'commissions' && summary && summary.commissions.pending > 0 && (
              <span className="bg-yellow-500 text-black text-xs rounded-full px-1.5 font-bold">{fmt(summary.commissions.pending)}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Status Filter ── */}
      {tab !== 'reports' && tab !== 'salaries' && (
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
          {tab === 'salaries' && (
            <SalariesTab
              salaries={salaries}
              updatingId={updatingId}
              onPatch={patchSalary}
              onGenerate={handleGenerateSalaries}
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
    </div>
  );
}
