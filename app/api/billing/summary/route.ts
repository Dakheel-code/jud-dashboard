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
      .select('amount, vat_amount, total_amount, status')
      .eq('period', period);

    const totalPaid    = (invoices || []).filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount), 0);
    const totalUnpaid  = (invoices || []).filter(i => i.status === 'unpaid').reduce((s, i) => s + Number(i.total_amount), 0);
    const totalPartial = (invoices || []).filter(i => i.status === 'partial').reduce((s, i) => s + Number(i.total_amount), 0);
    const totalVoid    = (invoices || []).filter(i => i.status === 'void').reduce((s, i) => s + Number(i.total_amount), 0);

    // ── عمولات الشهر ──────────────────────────────────────────────
    const { data: commissions } = await supabase
      .from('employee_commissions')
      .select('commission_amount, status')
      .eq('period', period);

    const totalCommissions = (commissions || [])
      .filter(c => c.status !== 'canceled')
      .reduce((s, c) => s + Number(c.commission_amount), 0);

    const paidCommissions = (commissions || [])
      .filter(c => c.status === 'paid')
      .reduce((s, c) => s + Number(c.commission_amount), 0);

    // ── بونص الشهر ────────────────────────────────────────────────
    const { data: bonuses } = await supabase
      .from('employee_bonuses')
      .select('bonus_amount, status')
      .eq('period', period);

    const totalBonuses = (bonuses || [])
      .filter(b => b.status !== 'canceled')
      .reduce((s, b) => s + Number(b.bonus_amount), 0);

    return NextResponse.json({
      period,
      invoices: {
        count:        (invoices || []).length,
        total_paid:   Math.round(totalPaid   * 100) / 100,
        total_unpaid: Math.round((totalUnpaid + totalPartial) * 100) / 100,
        total_void:   Math.round(totalVoid   * 100) / 100,
      },
      commissions: {
        total:  Math.round(totalCommissions * 100) / 100,
        paid:   Math.round(paidCommissions  * 100) / 100,
        pending: Math.round((totalCommissions - paidCommissions) * 100) / 100,
      },
      bonuses: {
        total: Math.round(totalBonuses * 100) / 100,
      },
      net_revenue: Math.round((totalPaid - totalCommissions - totalBonuses) * 100) / 100,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
