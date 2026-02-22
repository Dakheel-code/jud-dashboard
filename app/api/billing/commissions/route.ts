import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const period     = searchParams.get('period');
    const status     = searchParams.get('status');
    const employeeId = searchParams.get('employee_id');
    const page       = Number(searchParams.get('page') || 1);
    const limit      = Number(searchParams.get('limit') || 50);

    let query = supabase
      .from('employee_commissions')
      .select(`
        id, employee_id, store_id, invoice_id, period,
        base_amount, commission_amount, status,
        created_at, paid_at, notes,
        employee:admin_users(id, name, username),
        store:stores(id, store_name, store_url),
        invoice:store_invoices(id, invoice_number, total_amount)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (period)     query = query.eq('period', period);
    if (status)     query = query.eq('status', status);
    if (employeeId) query = query.eq('employee_id', employeeId);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ commissions: data || [], total: count || 0, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// تحديث حالة العمولة (approved / paid / canceled)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id و status مطلوبان' }, { status: 400 });
    }

    const updateData: Record<string, any> = { status };
    if (notes !== undefined) updateData.notes = notes;
    if (status === 'paid') updateData.paid_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('employee_commissions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, commission: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
