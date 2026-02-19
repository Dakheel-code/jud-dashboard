/**
 * POST /api/admin/stores/logo/backfill
 * يعالج المتاجر التي تحتاج شعاراً على دفعات (Batch) مع concurrency محدود
 *
 * Body:
 *   batchSize   - عدد المتاجر في الدفعة (افتراضي: 20)
 *   onlyMissing - true = فقط pending/failed (افتراضي: true)
 *   concurrency - عدد الطلبات المتوازية (افتراضي: 3، حد أقصى: 5)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic    = 'force-dynamic';
export const maxDuration = 60;

const REFRESH_URL = '/api/admin/stores/logo/refresh';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

/** تنفيذ مهام بتوازٍ محدود */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index++;
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

export async function POST(req: NextRequest) {
  let batchSize   = 20;
  let onlyMissing = true;
  let concurrency = 3;

  try {
    const body  = await req.json();
    batchSize   = Math.min(Math.max(parseInt(body.batchSize)   || 20, 1), 100);
    concurrency = Math.min(Math.max(parseInt(body.concurrency) || 3,  1), 5);
    if (body.onlyMissing === false) onlyMissing = false;
  } catch { /* استخدم القيم الافتراضية */ }

  const supabase = getAdminClient();

  // ── جلب المتاجر المستهدفة ────────────────────────────────
  let query = supabase
    .from('stores')
    .select('id, store_url, store_name, logo_status')
    .limit(batchSize);

  if (onlyMissing) {
    query = query.or('logo_url.is.null,logo_status.in.(pending,failed)');
  }

  const { data: stores, error: fetchErr } = await query;

  if (fetchErr) {
    return NextResponse.json({ error: 'فشل جلب المتاجر: ' + fetchErr.message }, { status: 500 });
  }

  if (!stores || stores.length === 0) {
    return NextResponse.json({
      message:   'لا توجد متاجر تحتاج معالجة',
      processed: 0,
      ready:     0,
      failed:    0,
      skipped:   0,
      remaining: 0,
    });
  }

  // ── بناء الـ base URL للـ refresh endpoint ───────────────
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || process.env.NEXTAUTH_URL
    || 'http://localhost:3000';

  // ── تنفيذ refresh لكل متجر بتوازٍ محدود ─────────────────
  type StoreResult = {
    id:        string;
    store_url: string;
    status:    'ready' | 'failed' | 'skipped';
    logo_url?: string;
    error?:    string;
  };

  const tasks = stores.map(store => async (): Promise<StoreResult> => {
    if (!store.store_url) {
      return { id: store.id, store_url: '', status: 'skipped', error: 'store_url فارغ' };
    }

    try {
      const res = await fetch(`${baseUrl}${REFRESH_URL}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ storeId: store.id, storeUrl: store.store_url }),
        signal:  AbortSignal.timeout(25000),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.logo_url) {
        return { id: store.id, store_url: store.store_url, status: 'ready', logo_url: data.logo_url };
      }
      return { id: store.id, store_url: store.store_url, status: 'failed', error: data.error || `HTTP ${res.status}` };
    } catch (err: any) {
      return { id: store.id, store_url: store.store_url, status: 'failed', error: err.message };
    }
  });

  const results = await runWithConcurrency(tasks, concurrency);

  // ── إحصائيات ─────────────────────────────────────────────
  const ready   = results.filter(r => r.status === 'ready').length;
  const failed  = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  // ── عدد المتبقين بعد هذه الدفعة ──────────────────────────
  const { count: remaining } = await supabase
    .from('stores')
    .select('id', { count: 'exact', head: true })
    .or('logo_url.is.null,logo_status.in.(pending,failed)');

  return NextResponse.json({
    processed:  stores.length,
    ready,
    failed,
    skipped,
    remaining:  remaining ?? 0,
    hasMore:    (remaining ?? 0) > 0,
    results:    results.map(r => ({
      id:        r.id,
      store_url: r.store_url,
      status:    r.status,
      logo_url:  r.logo_url,
      error:     r.error,
    })),
  });
}
