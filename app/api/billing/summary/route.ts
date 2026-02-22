import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function currentPeriod(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || currentPeriod();

    // ── فواتير الشهر ──────────────────────────────────────────────
    const { data: invoices } = await supabase
      .from('store_invoices')
      .select('amount, vat_amount, total_amount, status, store_id, stores(store_name)')
      .eq('period', period);

    const invList = invoices || [];
    const paidInvs    = invList.filter(i => i.status === 'paid');
    const unpaidInvs  = invList.filter(i => i.status === 'unpaid');
    const partialInvs = invList.filter(i => i.status === 'partial');
    const voidInvs    = invList.filter(i => i.status === 'void');

    const totalPaid    = paidInvs.reduce((s, i) => s + Number(i.total_amount), 0);
    const totalUnpaid  = unpaidInvs.reduce((s, i) => s + Number(i.total_amount), 0);
    const totalPartial = partialInvs.reduce((s, i) => s + Number(i.total_amount), 0);
    const totalVoid    = voidInvs.reduce((s, i) => s + Number(i.total_amount), 0);
    const totalAll     = totalPaid + totalUnpaid + totalPartial;
    const avgInvoice   = invList.length > 0 ? totalAll / invList.length : 0;
    const collectionRate = totalAll > 0 ? Math.round((totalPaid / totalAll) * 100) : 0;

    // ── عمولات الشهر ──────────────────────────────────────────────
    const { data: commissions } = await supabase
      .from('employee_commissions')
      .select('commission_amount, status, employee_id')
      .eq('period', period);

    const commList = commissions || [];
    const totalCommissions  = commList.filter(c => c.status !== 'canceled').reduce((s, c) => s + Number(c.commission_amount), 0);
    const paidCommissions   = commList.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.commission_amount), 0);
    const pendingComm       = commList.filter(c => c.status === 'pending').reduce((s, c) => s + Number(c.commission_amount), 0);
    const approvedComm      = commList.filter(c => c.status === 'approved').reduce((s, c) => s + Number(c.commission_amount), 0);
    const uniqueEmployees   = new Set(commList.map(c => c.employee_id)).size;

    // ── بونص الشهر ────────────────────────────────────────────────
    const { data: bonuses } = await supabase
      .from('employee_bonuses')
      .select('bonus_amount, status')
      .eq('period', period);

    const bonList      = bonuses || [];
    const totalBonuses = bonList.filter(b => b.status !== 'canceled').reduce((s, b) => s + Number(b.bonus_amount), 0);
    const paidBonuses  = bonList.filter(b => b.status === 'paid').reduce((s, b) => s + Number(b.bonus_amount), 0);

    // ── هامش الربح ────────────────────────────────────────────────
    const totalExpenses  = totalCommissions + totalBonuses;
    const netRevenue     = totalPaid - totalExpenses;
    const profitMargin   = totalPaid > 0 ? Math.round((netRevenue / totalPaid) * 100) : 0;

    return NextResponse.json({
      period,
      invoices: {
        count:           invList.length,
        count_paid:      paidInvs.length,
        count_unpaid:    unpaidInvs.length,
        count_partial:   partialInvs.length,
        count_void:      voidInvs.length,
        total_paid:      Math.round(totalPaid    * 100) / 100,
        total_unpaid:    Math.round((totalUnpaid + totalPartial) * 100) / 100,
        total_void:      Math.round(totalVoid    * 100) / 100,
        avg_invoice:     Math.round(avgInvoice   * 100) / 100,
        collection_rate: collectionRate,
      },
      commissions: {
        total:            Math.round(totalCommissions * 100) / 100,
        paid:             Math.round(paidCommissions  * 100) / 100,
        pending:          Math.round(pendingComm      * 100) / 100,
        approved:         Math.round(approvedComm     * 100) / 100,
        unique_employees: uniqueEmployees,
      },
      bonuses: {
        total: Math.round(totalBonuses * 100) / 100,
        paid:  Math.round(paidBonuses  * 100) / 100,
      },
      expenses:      Math.round(totalExpenses * 100) / 100,
      net_revenue:   Math.round(netRevenue    * 100) / 100,
      profit_margin: profitMargin,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
