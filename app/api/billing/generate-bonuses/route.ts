import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

/** period = 'YYYY-MM' للشهر الماضي (الافتراضي) أو الحالي */
function currentPeriod(offset = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();

    const body = await req.json().catch(() => ({}));
    // period اختياري — الافتراضي: الشهر الماضي (أكثر منطقية للبونص)
    const period: string = body.period || currentPeriod(-1);
    // employee_id اختياري — لو فارغ يحسب للكل
    const targetEmployeeId: string | null = body.employee_id || null;

    // ── 1) جلب قواعد البونص النشطة ──────────────────────────────
    const { data: rules, error: rulesErr } = await supabase
      .from('bonus_rules')
      .select('*')
      .eq('active', true);

    if (rulesErr) throw rulesErr;
    if (!rules || rules.length === 0) {
      return NextResponse.json({ success: true, generated: 0, message: 'لا توجد قواعد بونص نشطة' });
    }

    // ── 2) جلب مجموع العمولات لكل موظف في الفترة ────────────────
    // base_amount = مجموع المبالغ المدفوعة (من الفواتير المدفوعة)
    let commissionsQuery = supabase
      .from('employee_commissions')
      .select('employee_id, base_amount, commission_amount')
      .eq('period', period);

    if (targetEmployeeId) {
      commissionsQuery = commissionsQuery.eq('employee_id', targetEmployeeId);
    }

    const { data: commissions, error: commErr } = await commissionsQuery;
    if (commErr) throw commErr;

    // ── 3) تجميع base_amount لكل موظف ───────────────────────────
    const employeeTotals: Record<string, { base: number; role: string }> = {};

    for (const c of commissions || []) {
      if (!employeeTotals[c.employee_id]) {
        employeeTotals[c.employee_id] = { base: 0, role: '' };
      }
      employeeTotals[c.employee_id].base += Number(c.base_amount);
    }

    // ── 4) جلب دور كل موظف من store_assignments ─────────────────
    const employeeIds = Object.keys(employeeTotals);
    if (employeeIds.length === 0) {
      return NextResponse.json({ success: true, generated: 0, message: `لا توجد عمولات للفترة ${period}` });
    }

    const { data: assignments, error: assignErr } = await supabase
      .from('store_assignments')
      .select('employee_id, role')
      .in('employee_id', employeeIds)
      .eq('active', true);

    if (assignErr) throw assignErr;

    // أخذ أول دور لكل موظف (الأساسي)
    for (const a of assignments || []) {
      if (employeeTotals[a.employee_id] && !employeeTotals[a.employee_id].role) {
        employeeTotals[a.employee_id].role = a.role;
      }
    }

    // ── 5) حساب وإدراج البونص لكل موظف ─────────────────────────
    let generated = 0;
    let skipped   = 0;
    const errors: string[] = [];

    for (const [employeeId, totals] of Object.entries(employeeTotals)) {
      const { base, role } = totals;
      if (!role) continue; // موظف بدون دور — تخطى

      // ابحث عن قاعدة بونص تنطبق على دوره
      const matchingRules = rules.filter(r => r.applies_to_role === role);
      if (matchingRules.length === 0) continue;

      for (const rule of matchingRules) {
        let bonusAmount: number;

        if (rule.rate_type === 'percentage') {
          bonusAmount = Math.round((base * (Number(rule.rate_value) / 100)) * 100) / 100;
        } else {
          // fixed
          bonusAmount = Math.round(Number(rule.rate_value) * 100) / 100;
        }

        if (bonusAmount <= 0) continue;

        // upsert — unique key (employee_id, period, rule_id) يمنع التكرار
        const { error: insertErr } = await supabase
          .from('employee_bonuses')
          .insert({
            employee_id:  employeeId,
            period:       period,
            rule_id:      rule.id,
            base_value:   base,
            bonus_amount: bonusAmount,
            status:       'pending',
          });

        if (insertErr) {
          if (insertErr.code === '23505') {
            skipped++;
          } else {
            errors.push(`employee ${employeeId} / rule ${rule.name}: ${insertErr.message}`);
          }
        } else {
          generated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      period,
      employees_processed: employeeIds.length,
      generated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
