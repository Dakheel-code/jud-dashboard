import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '../../_lib/supabase';
import { upsertClient } from '@/app/api/admin/stores/_lib/upsertClient';

export const dynamic = 'force-dynamic';

// ── جلب اسم المتجر من الموقع إذا كان فارغاً ─────────────────
async function fetchStoreName(storeUrl: string): Promise<string | null> {
  try {
    const url = storeUrl.startsWith('http') ? storeUrl : `https://${storeUrl}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal:  AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const ogSite  = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
    if (ogSite?.[1])  return ogSite[1].trim();
    const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
    if (ogTitle?.[1]) return ogTitle[1].trim();
    const title   = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (title?.[1])   return title[1].trim().split(/[|\-–]/)[0].trim();
    return null;
  } catch { return null; }
}

// ── نوع نتيجة صف من الـ RPC ───────────────────────────────────
interface RpcRowResult {
  row_index:  number;
  store_id:   string | null;
  action:     'insert' | 'update' | 'skip' | 'error';
  matched_by: 'store_url' | 'owner_phone' | 'owner_email' | null;
  error:      string | null;
}

interface RpcResult {
  inserted: number;
  updated:  number;
  skipped:  number;
  errors:   number;
  rows:     RpcRowResult[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase   = getAdminClient();
    const { jobId }  = params;
    const body       = await request.json().catch(() => ({}));
    const skipErrors: boolean = body.skip_errors ?? true;

    // ── التحقق من الـ Job ─────────────────────────────────────
    const { data: job, error: jobErr } = await supabase
      .from('store_import_jobs')
      .select('id, status')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: 'وظيفة الاستيراد غير موجودة' }, { status: 404 });
    }
    if (job.status === 'committed') {
      return NextResponse.json({ error: 'تم تنفيذ هذه الوظيفة مسبقاً' }, { status: 400 });
    }
    if (job.status === 'failed') {
      return NextResponse.json({ error: 'الوظيفة في حالة فشل — لا يمكن تنفيذها' }, { status: 400 });
    }

    // ── جلب الصفوف القابلة للحفظ ─────────────────────────────
    const eligibleStatuses = skipErrors ? ['valid', 'warning'] : ['valid', 'warning', 'error'];
    const { data: rows, error: rowsErr } = await supabase
      .from('store_import_rows')
      .select('id, row_index, normalized_row, errors, status')
      .eq('job_id', jobId)
      .in('status', eligibleStatuses)
      .order('row_index', { ascending: true });

    if (rowsErr) {
      return NextResponse.json({ error: 'فشل جلب الصفوف: ' + rowsErr.message }, { status: 500 });
    }
    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'لا توجد صفوف صالحة للحفظ' }, { status: 400 });
    }

    // ── تجميع الصفوف بدون store_url (skip مباشرة) ────────────
    const skippedRowIds: string[] = [];
    const rpcPayload: Record<string, unknown>[] = [];

    for (const row of rows) {
      const norm = row.normalized_row as Record<string, unknown> | null;
      if (!norm?.store_url) {
        skippedRowIds.push(row.id);
        continue;
      }

      // جلب اسم المتجر تلقائياً إذا كان فارغاً (قبل إرسال الـ RPC)
      let storeName = (norm.store_name as string) || '';
      if (!storeName) {
        storeName = (await fetchStoreName(norm.store_url as string)) || '';
      }

      rpcPayload.push({
        row_index:               row.row_index,
        store_url:               norm.store_url               ?? '',
        store_name:              storeName,
        owner_name:              norm.owner_name              ?? '',
        owner_phone:             norm.owner_phone             ?? '',
        owner_email:             norm.owner_email             ?? '',
        priority:                norm.priority                ?? 'medium',
        status:                  norm.status                  ?? 'new',
        budget:                  norm.budget                  ?? null,
        category:                norm.category                ?? '',
        store_group_url:         norm.store_group_url         ?? '',
        subscription_start_date: norm.subscription_start_date ?? '',
        account_manager_id:      norm.account_manager_id      ?? '',
        media_buyer_id:          norm.media_buyer_id          ?? '',
        notes:                   norm.notes                   ?? '',
      });
    }

    // ── تحديث الصفوف المتجاهلة ───────────────────────────────
    if (skippedRowIds.length > 0) {
      await supabase
        .from('store_import_rows')
        .update({ status: 'skipped', action: 'skip' })
        .in('id', skippedRowIds);
    }

    if (rpcPayload.length === 0) {
      return NextResponse.json({ error: 'لا توجد صفوف صالحة للحفظ بعد الفلترة' }, { status: 400 });
    }

    // ── استدعاء الـ RPC (Bulk Upsert داخل Transaction) ────────
    const { data: rpcData, error: rpcErr } = await supabase
      .rpc('import_stores_bulk', { p_rows: rpcPayload });

    if (rpcErr) {
      // Fallback: إذا لم تكن الـ RPC موجودة بعد → استخدم الـ upsert المباشر
      if (rpcErr.message.includes('function') && rpcErr.message.includes('does not exist')) {
        return await fallbackDirectUpsert(supabase, rows, rpcPayload, jobId, skippedRowIds.length);
      }
      await supabase.from('store_import_jobs')
        .update({ status: 'failed', error_message: rpcErr.message })
        .eq('id', jobId);
      return NextResponse.json({ error: 'فشل تنفيذ الاستيراد: ' + rpcErr.message }, { status: 500 });
    }

    const result = rpcData as RpcResult;

    // ── upsert العملاء بناءً على owner_phone لكل صف ناجح ────────
    // يعمل بالتوازي مع تحديث الصفوف
    const rowIndexToNorm = new Map(rows.map(r => [r.row_index, r.normalized_row as Record<string, unknown>]));

    const clientUpserts = result.rows
      .filter((r: RpcRowResult) => r.action !== 'error' && r.store_id)
      .map(async (r: RpcRowResult) => {
        const norm = rowIndexToNorm.get(r.row_index);
        if (!norm?.owner_phone) return;
        await upsertClient(
          supabase,
          {
            owner_name:  (norm.owner_name  as string) || '',
            owner_phone: (norm.owner_phone as string),
            owner_email: (norm.owner_email as string) || null,
          },
          r.store_id!,
        );
      });

    // ── تحديث store_import_rows بنتائج الـ RPC ────────────────
    const rowIndexToDbId = new Map(rows.map(r => [r.row_index, r.id]));
    const now = new Date().toISOString();

    const rowUpdates = result.rows.map((r: RpcRowResult) => {
      const dbId = rowIndexToDbId.get(r.row_index);
      if (!dbId) return null;
      return supabase.from('store_import_rows').update({
        status:       r.action === 'error' ? 'error' : 'committed',
        action:       r.action,
        store_id:     r.store_id ?? null,
        committed_at: r.action !== 'error' ? now : null,
        ...(r.error ? { errors: [{ field: 'commit', message: r.error }] } : {}),
      }).eq('id', dbId);
    }).filter(Boolean);

    await Promise.all([...rowUpdates, ...clientUpserts]);

    // ── تحديث الـ Job ─────────────────────────────────────────
    const commitErrors = result.rows
      .filter((r: RpcRowResult) => r.action === 'error')
      .map((r: RpcRowResult) => `صف ${r.row_index}: ${r.error}`);

    await supabase.from('store_import_jobs').update({
      status:         'committed',
      committed_rows: result.inserted + result.updated,
      skipped_rows:   skippedRowIds.length,
      committed_at:   now,
    }).eq('id', jobId);

    return NextResponse.json({
      success:  true,
      inserted: result.inserted,
      updated:  result.updated,
      skipped:  skippedRowIds.length,
      errors:   commitErrors,
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'خطأ غير متوقع: ' + err.message }, { status: 500 });
  }
}

// ── Fallback: Upsert مباشر إذا لم تكن الـ RPC مثبّتة بعد ─────
async function fallbackDirectUpsert(
  supabase: ReturnType<typeof import('../../_lib/supabase').getAdminClient>,
  rows: any[],
  payload: Record<string, unknown>[],
  jobId: string,
  skippedCount: number,
) {
  let insertedCount = 0;
  let updatedCount  = 0;
  const commitErrors: string[] = [];
  const now = new Date().toISOString();

  // جلب المتاجر الموجودة
  const urls   = payload.map(p => p.store_url as string).filter(Boolean);
  const phones = payload.map(p => p.owner_phone as string).filter(Boolean);
  const emails = payload.map(p => p.owner_email as string).filter(Boolean);

  const [{ data: byUrl }, { data: byPhone }, { data: byEmail }] = await Promise.all([
    supabase.from('stores').select('id, store_url').in('store_url', urls),
    supabase.from('stores').select('id, owner_phone').in('owner_phone', phones),
    supabase.from('stores').select('id, owner_email').in('owner_email', emails),
  ]);

  const urlMap   = new Map((byUrl   ?? []).map((s: any) => [s.store_url,   s.id]));
  const phoneMap = new Map((byPhone ?? []).map((s: any) => [s.owner_phone, s.id]));
  const emailMap = new Map((byEmail ?? []).map((s: any) => [s.owner_email, s.id]));

  const rowIndexToDbId = new Map(rows.map(r => [r.row_index, r.id]));

  for (const p of payload) {
    const dbRowId = rowIndexToDbId.get(p.row_index as number);
    const existingId =
      urlMap.get(p.store_url as string) ??
      phoneMap.get(p.owner_phone as string) ??
      emailMap.get(p.owner_email as string) ??
      null;

    try {
      const storeData = {
        store_url:               p.store_url               || null,
        store_name:              p.store_name              || null,
        owner_name:              p.owner_name              || null,
        owner_phone:             p.owner_phone             || null,
        owner_email:             p.owner_email             || null,
        priority:                p.priority                ?? 'medium',
        status:                  p.status                  ?? 'new',
        budget:                  p.budget                  ?? null,
        category:                p.category                || null,
        store_group_url:         p.store_group_url         || null,
        subscription_start_date: p.subscription_start_date || null,
        account_manager_id:      p.account_manager_id      || null,
        media_buyer_id:          p.media_buyer_id          || null,
        notes:                   p.notes                   || null,
      };

      if (existingId) {
        await supabase.from('stores').update(storeData).eq('id', existingId);
        if (dbRowId) await supabase.from('store_import_rows').update({ status: 'committed', action: 'update', store_id: existingId, committed_at: now }).eq('id', dbRowId);
        // ربط العميل بالمتجر المحدَّث
        if (p.owner_phone) await upsertClient(supabase, { owner_name: p.owner_name as string || '', owner_phone: p.owner_phone as string, owner_email: p.owner_email as string || null }, existingId);
        updatedCount++;
      } else {
        const { data: ins } = await supabase.from('stores').insert(storeData).select('id').single();
        if (dbRowId && ins) await supabase.from('store_import_rows').update({ status: 'committed', action: 'insert', store_id: ins.id, committed_at: now }).eq('id', dbRowId);
        // ربط العميل بالمتجر الجديد
        if (ins && p.owner_phone) await upsertClient(supabase, { owner_name: p.owner_name as string || '', owner_phone: p.owner_phone as string, owner_email: p.owner_email as string || null }, ins.id);
        insertedCount++;
      }
    } catch (err: any) {
      commitErrors.push(`صف ${p.row_index}: ${err.message}`);
      if (dbRowId) await supabase.from('store_import_rows').update({ status: 'error', errors: [{ field: 'commit', message: err.message }] }).eq('id', dbRowId);
    }
  }

  await supabase.from('store_import_jobs').update({
    status: 'committed', committed_rows: insertedCount + updatedCount, skipped_rows: skippedCount, committed_at: now,
  }).eq('id', jobId);

  return NextResponse.json({ success: true, inserted: insertedCount, updated: updatedCount, skipped: skippedCount, errors: commitErrors });
}
