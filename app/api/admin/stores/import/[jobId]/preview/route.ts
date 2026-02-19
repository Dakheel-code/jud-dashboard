import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '../../_lib/supabase';
import { findDedupMatch } from '@/lib/import/normalize/storeRow';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = getAdminClient();
    const { jobId } = params;

    const url      = new URL(request.url);
    const page     = parseInt(url.searchParams.get('page')     ?? '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') ?? '50');
    const filter   = url.searchParams.get('filter') ?? 'all';

    // ── جلب الـ Job ──────────────────────────────────────────
    const { data: job, error: jobErr } = await supabase
      .from('store_import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: 'وظيفة الاستيراد غير موجودة' }, { status: 404 });
    }

    // ── جلب الصفوف مع pagination ─────────────────────────────
    let query = supabase
      .from('store_import_rows')
      .select('*', { count: 'exact' })
      .eq('job_id', jobId)
      .order('row_index', { ascending: true })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data: rows, count, error: rowsErr } = await query;

    if (rowsErr) {
      return NextResponse.json({ error: 'فشل جلب الصفوف: ' + rowsErr.message }, { status: 500 });
    }

    // ── جمع مفاتيح Dedup من الصفوف ───────────────────────────
    const storeUrls = (rows ?? []).map(r => r.normalized_row?.store_url).filter(Boolean) as string[];
    const phones    = (rows ?? []).map(r => r.normalized_row?.owner_phone).filter(Boolean) as string[];
    const emails    = (rows ?? []).map(r => r.normalized_row?.owner_email).filter(Boolean) as string[];

    // ── جلب المتاجر الموجودة بالمفاتيح الثلاثة دفعة واحدة ────
    const [{ data: byUrl }, { data: byPhone }, { data: byEmail }] = await Promise.all([
      storeUrls.length > 0
        ? supabase.from('stores').select('id, store_url, store_name, owner_phone, owner_email').in('store_url', storeUrls)
        : { data: [] },
      phones.length > 0
        ? supabase.from('stores').select('id, store_url, store_name, owner_phone, owner_email').in('owner_phone', phones)
        : { data: [] },
      emails.length > 0
        ? supabase.from('stores').select('id, store_url, store_name, owner_phone, owner_email').in('owner_email', emails)
        : { data: [] },
    ]);

    // دمج النتائج وإزالة التكرار
    const allExisting = [
      ...(byUrl   ?? []),
      ...(byPhone ?? []),
      ...(byEmail ?? []),
    ];
    const uniqueExisting = Array.from(
      new Map(allExisting.map(s => [s.id, s])).values()
    );

    // ── إضافة expected_action + dedup info لكل صف ────────────
    const rowsWithAction = (rows ?? []).map(row => {
      const norm = row.normalized_row ?? {};

      if (row.status === 'error') {
        return { ...row, expected_action: 'skip', existing_store: null, matched_by: null };
      }

      const dedupMatch = findDedupMatch(
        {
          store_url:   norm.store_url   ?? '',
          owner_phone: norm.owner_phone ?? '',
          owner_email: norm.owner_email ?? '',
        },
        uniqueExisting
      );

      return {
        ...row,
        expected_action: dedupMatch.matched ? 'update' : 'insert',
        matched_by:      dedupMatch.matchedBy ?? null,
        existing_store:  dedupMatch.matched
          ? uniqueExisting.find(s => s.id === dedupMatch.existingId) ?? null
          : null,
      };
    });

    // ── إحصاء المكررة في هذه الصفحة ─────────────────────────
    const duplicatesInPage = rowsWithAction.filter(r => r.expected_action === 'update').length;

    return NextResponse.json({
      job,
      rows: rowsWithAction,
      pagination: {
        page,
        pageSize,
        total:      count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
      summary: {
        total:      job.total_rows,
        valid:      job.valid_rows,
        warnings:   job.warning_rows,
        errors:     job.error_rows,
        duplicates: duplicatesInPage,
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'خطأ غير متوقع: ' + err.message }, { status: 500 });
  }
}
