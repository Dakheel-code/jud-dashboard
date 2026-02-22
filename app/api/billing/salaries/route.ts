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

// ── GET: جلب رواتب الشهر ──────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || currentPeriod();
    const status = searchParams.get('status') || '';

    let query = supabase
      .from('employee_salaries')
      .select(`
        id, employee_id, period, base_salary, deductions, additions,
        net_salary, status, notes, created_at, approved_at, paid_at,
        employee:admin_users(id, name, username, role, avatar)
      `)
      .eq('period', period)
      .order('created_at', { ascending: true });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ salaries: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST: توليد رواتب شهر معين لجميع الموظفين النشطين ─────────
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const period = body.period || currentPeriod();

    // جلب جميع الموظفين النشطين الذين لديهم راتب محدد
    const { data: employees, error: empErr } = await supabase
      .from('admin_users')
      .select('id, name, monthly_salary')
      .eq('is_active', true)
      .not('monthly_salary', 'is', null)
      .gt('monthly_salary', 0);

    if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 });

    let generated = 0;
    let skipped = 0;

    for (const emp of employees || []) {
      const base = Number(emp.monthly_salary);
      const net  = base; // الصافي = الأساسي (بدون خصومات/إضافات مبدئياً)

      const { error: insErr } = await supabase
        .from('employee_salaries')
        .insert({
          employee_id: emp.id,
          period,
          base_salary: base,
          deductions:  0,
          additions:   0,
          net_salary:  net,
          status:      'pending',
        })
        .select()
        .single();

      if (insErr) {
        if (insErr.code === '23505') { skipped++; } // unique violation = موجود مسبقاً
        else return NextResponse.json({ error: insErr.message }, { status: 500 });
      } else {
        generated++;
      }
    }

    return NextResponse.json({ generated, skipped, period });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: تحديث حالة راتب أو تعديل الخصومات/الإضافات ────────
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const { id, status, deductions, additions, notes } = body;

    if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });

    // جلب السجل الحالي لإعادة حساب الصافي
    const { data: current, error: fetchErr } = await supabase
      .from('employee_salaries')
      .select('base_salary, deductions, additions')
      .eq('id', id)
      .single();

    if (fetchErr || !current) return NextResponse.json({ error: 'السجل غير موجود' }, { status: 404 });

    const newDeductions = deductions !== undefined ? Number(deductions) : Number(current.deductions);
    const newAdditions  = additions  !== undefined ? Number(additions)  : Number(current.additions);
    const newNet        = Number(current.base_salary) - newDeductions + newAdditions;

    const updateData: any = {
      deductions: newDeductions,
      additions:  newAdditions,
      net_salary: Math.round(newNet * 100) / 100,
    };

    if (notes     !== undefined) updateData.notes = notes;
    if (status    !== undefined) updateData.status = status;
    if (status === 'approved')   updateData.approved_at = new Date().toISOString();
    if (status === 'paid')       updateData.paid_at     = new Date().toISOString();

    const { data, error } = await supabase
      .from('employee_salaries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ salary: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
