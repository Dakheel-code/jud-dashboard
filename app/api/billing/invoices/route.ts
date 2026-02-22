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
    const period   = searchParams.get('period');
    const status   = searchParams.get('status');
    const storeId  = searchParams.get('store_id');
    const page     = Number(searchParams.get('page') || 1);
    const limit    = Number(searchParams.get('limit') || 50);

    let query = supabase
      .from('store_invoices')
      .select(`
        id, store_id, period, invoice_number,
        amount, vat_amount, total_amount,
        status, issue_date, due_date, paid_at,
        created_at, notes,
        store:stores(id, store_name, store_url, owner_name)
      `, { count: 'exact' })
      .order('issue_date', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (period)  query = query.eq('period', period);
    if (status)  query = query.eq('status', status);
    if (storeId) query = query.eq('store_id', storeId);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ invoices: data || [], total: count || 0, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// تحديث حالة الفاتورة (paid / unpaid / void)
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
    if (status !== 'paid') updateData.paid_at = null;

    const { data, error } = await supabase
      .from('store_invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, invoice: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
