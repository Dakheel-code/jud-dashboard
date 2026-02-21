import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

/** آخر يوم في الشهر */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** يوم الفاتورة = min(billing_day, آخر يوم في الشهر) */
function issueDate(year: number, month: number, billingDay: number): string {
  const day = Math.min(billingDay, lastDayOfMonth(year, month));
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** period = 'YYYY-MM' */
function period(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();

    // ── اختياري: تمرير store_id واحد أو توليد للكل ──────────────
    const body = await req.json().catch(() => ({}));
    const targetStoreId: string | null = body.store_id || null;

    // ── جلب المتاجر النشطة التي لها subscription_start_date + billing_amount ──
    let query = supabase
      .from('stores')
      .select('id, store_name, subscription_start_date, billing_amount, billing_type')
      .not('subscription_start_date', 'is', null)
      .not('billing_amount', 'is', null)
      .eq('is_active', true);

    if (targetStoreId) query = query.eq('id', targetStoreId);

    const { data: stores, error: storesErr } = await query;
    if (storesErr) throw storesErr;
    if (!stores || stores.length === 0) {
      return NextResponse.json({ success: true, generated: 0, message: 'لا توجد متاجر مؤهلة' });
    }

    const now = new Date();
    const currentYear  = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    let generated = 0;
    let skipped   = 0;
    const errors: string[] = [];

    for (const store of stores) {
      try {
        const startDate  = new Date(store.subscription_start_date);
        const billingDay = startDate.getDate();          // يوم الاشتراك (1-31)
        const amount     = Number(store.billing_amount); // المبلغ قبل الضريبة
        const vatAmount  = Math.round(amount * 0.15 * 100) / 100; // 15% VAT
        const totalAmount = Math.round((amount + vatAmount) * 100) / 100;

        // ── حدد نطاق الأشهر: من بداية الاشتراك حتى الشهر الحالي ──
        let y = startDate.getFullYear();
        let m = startDate.getMonth(); // 0-indexed

        while (y < currentYear || (y === currentYear && m <= currentMonth)) {
          const per      = period(y, m);
          const iDate    = issueDate(y, m, billingDay);

          // due_date = 7 أيام بعد issue_date
          const issueDateObj = new Date(iDate);
          const dueDateObj   = new Date(issueDateObj);
          dueDateObj.setDate(dueDateObj.getDate() + 7);
          const dueDate = dueDateObj.toISOString().split('T')[0];

          // invoice_number = STORE-YYYYMM
          const invoiceNumber = `INV-${store.id.slice(0, 6).toUpperCase()}-${per.replace('-', '')}`;

          // upsert — unique key (store_id, period) يمنع التكرار
          const { error: insertErr } = await supabase
            .from('store_invoices')
            .insert({
              store_id:       store.id,
              period:         per,
              invoice_number: invoiceNumber,
              amount:         amount,
              vat_amount:     vatAmount,
              total_amount:   totalAmount,
              status:         'unpaid',
              issue_date:     iDate,
              due_date:       dueDate,
            })
            .select('id')
            .single();

          if (insertErr) {
            if (insertErr.code === '23505') {
              // unique violation — الفاتورة موجودة مسبقاً
              skipped++;
            } else {
              errors.push(`${store.store_name} / ${per}: ${insertErr.message}`);
            }
          } else {
            generated++;
          }

          // التقدم للشهر التالي
          m++;
          if (m > 11) { m = 0; y++; }
        }
      } catch (storeErr: any) {
        errors.push(`${store.store_name}: ${storeErr.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      generated,
      skipped,
      stores_processed: stores.length,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// GET — للتشغيل اليدوي من المتصفح أو Netlify Scheduled Function
export async function GET(req: NextRequest) {
  return POST(req);
}
