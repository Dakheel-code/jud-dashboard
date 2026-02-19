import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '../../_lib/supabase';

export const dynamic = 'force-dynamic';

// ── Labels ────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  valid:     '✓ صالح',
  warning:   '⚠ تحذير',
  error:     '✗ خطأ',
  committed: '✓ محفوظ',
  skipped:   '— متجاهل',
  pending:   '… معلق',
};
const ACTION_LABEL: Record<string, string> = {
  insert: 'إضافة جديدة',
  update: 'تحديث',
  skip:   'تجاهل',
  error:  'خطأ',
};

// ── أعمدة القالب العربي (نفس ترتيب template/route.ts) ─────────
const TEMPLATE_HEADERS = [
  'اسم المتجر *', 'رابط المتجر *', 'اسم صاحب المتجر',
  'رقم الجوال *', 'البريد الإلكتروني', 'الأولوية', 'الحالة',
  'الميزانية', 'التصنيف', 'رابط قروب المتجر',
  'تاريخ بداية الاشتراك', 'مدير الحساب', 'الميديا باير', 'ملاحظات',
];

function normToTemplateRow(n: Record<string, unknown>): unknown[] {
  return [
    n.store_name              ?? '',
    n.store_url               ?? '',
    n.owner_name              ?? '',
    n.owner_phone             ?? '',
    n.owner_email             ?? '',
    n.priority                ?? '',
    n.status                  ?? '',
    n.budget                  ?? '',
    n.category                ?? '',
    n.store_group_url         ?? '',
    n.subscription_start_date ?? '',
    n.account_manager_id      ?? '',
    n.media_buyer_id          ?? '',
    n.notes                   ?? '',
  ];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const supabase = getAdminClient();
    const { jobId } = params;
    const format   = new URL(request.url).searchParams.get('format') ?? 'corrected';
    // format: 'corrected' | 'errors_excel' | 'errors_json'

    // ── جلب الـ Job ──────────────────────────────────────────
    const { data: job, error: jobErr } = await supabase
      .from('store_import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: 'وظيفة الاستيراد غير موجودة' }, { status: 404 });
    }

    // ── جلب جميع الصفوف ─────────────────────────────────────
    const { data: rows, error: rowsErr } = await supabase
      .from('store_import_rows')
      .select('*')
      .eq('job_id', jobId)
      .order('row_index', { ascending: true });

    if (rowsErr) {
      return NextResponse.json({ error: 'فشل جلب الصفوف: ' + rowsErr.message }, { status: 500 });
    }

    const allRows = rows ?? [];

    // ══════════════════════════════════════════════════════════
    // FORMAT: errors_json — تقرير JSON كامل
    // ══════════════════════════════════════════════════════════
    if (format === 'errors_json') {
      const report = {
        job: {
          id:           job.id,
          source_name:  job.source_name,
          status:       job.status,
          created_at:   job.created_at,
          total_rows:   job.total_rows,
          valid_rows:   job.valid_rows,
          warning_rows: job.warning_rows,
          error_rows:   job.error_rows,
          committed_rows: job.committed_rows,
          skipped_rows:   job.skipped_rows,
        },
        summary: {
          inserted: allRows.filter(r => r.action === 'insert').length,
          updated:  allRows.filter(r => r.action === 'update').length,
          skipped:  allRows.filter(r => r.status === 'skipped').length,
          errors:   allRows.filter(r => r.status === 'error').length,
          warnings: allRows.filter(r => r.status === 'warning').length,
        },
        rows: allRows.map(row => ({
          row_index:      row.row_index,
          status:         row.status,
          action:         row.action ?? null,
          store_id:       row.store_id ?? null,
          store_url:      row.normalized_row?.store_url ?? null,
          store_name:     row.normalized_row?.store_name ?? null,
          errors:         row.errors   ?? [],
          warnings:       row.warnings ?? [],
          autofixes:      row.autofixes ?? [],
          committed_at:   row.committed_at ?? null,
        })),
      };

      const json = JSON.stringify(report, null, 2);
      const filename = `import-report-${jobId.slice(0, 8)}.json`;
      return new NextResponse(json, {
        status: 200,
        headers: {
          'Content-Type':        'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const XLSX = await import('xlsx');
    const wb   = XLSX.utils.book_new();

    // ══════════════════════════════════════════════════════════
    // FORMAT: corrected — ملف Excel مصحّح (نفس القالب)
    // ══════════════════════════════════════════════════════════
    if (format === 'corrected') {
      // Sheet 1: البيانات المصحّحة (صالحة + تحذيرات + محفوظة)
      const committedRows = allRows.filter(r =>
        ['valid', 'warning', 'committed'].includes(r.status)
      );

      const dataRows = committedRows.map(row => normToTemplateRow(row.normalized_row ?? {}));
      const ws1 = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...dataRows]);
      ws1['!cols'] = [
        { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 16 }, { wch: 26 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 30 },
        { wch: 22 }, { wch: 36 }, { wch: 36 }, { wch: 28 },
      ];
      ws1['!freeze'] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, ws1, 'البيانات المصحّحة');

      // Sheet 2: ملخص
      const summaryRows = [
        ['📊 ملخص الاستيراد'],
        [''],
        ['المصدر',            job.source_name ?? ''],
        ['تاريخ الاستيراد',   new Date(job.created_at).toLocaleString('ar-SA')],
        [''],
        ['إجمالي الصفوف',     job.total_rows],
        ['✓ صالحة',           job.valid_rows],
        ['⚠ تحذيرات',         job.warning_rows],
        ['✗ أخطاء',           job.error_rows],
        ['✓ تم حفظه',         job.committed_rows ?? 0],
        ['— تم تجاهله',       job.skipped_rows   ?? 0],
        [''],
        ['إضافات جديدة',      allRows.filter(r => r.action === 'insert').length],
        ['تحديثات',           allRows.filter(r => r.action === 'update').length],
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(summaryRows);
      ws2['!cols'] = [{ wch: 22 }, { wch: 30 }];
      ws2['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
      XLSX.utils.book_append_sheet(wb, ws2, 'ملخص');

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const filename = `stores-corrected-${jobId.slice(0, 8)}.xlsx`;
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // ══════════════════════════════════════════════════════════
    // FORMAT: errors_excel — تقرير أخطاء Excel شامل
    // ══════════════════════════════════════════════════════════

    // Sheet 1: نتيجة كل صف
    const resultHeaders = [
      'رقم الصف', 'الحالة', 'الإجراء', 'رابط المتجر', 'اسم المتجر',
      'رقم الجوال', 'عدد الأخطاء', 'عدد التحذيرات', 'عدد التصحيحات', 'معرّف المتجر',
    ];
    const resultRows = allRows.map(row => {
      const n = row.normalized_row ?? {};
      return [
        row.row_index,
        STATUS_LABEL[row.status] ?? row.status,
        ACTION_LABEL[row.action ?? ''] ?? '',
        n.store_url   ?? '',
        n.store_name  ?? '',
        n.owner_phone ?? '',
        (row.errors   ?? []).length,
        (row.warnings ?? []).length,
        (row.autofixes ?? []).length,
        row.store_id  ?? '',
      ];
    });
    const wsResult = XLSX.utils.aoa_to_sheet([resultHeaders, ...resultRows]);
    wsResult['!cols'] = [
      { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 30 }, { wch: 22 },
      { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 38 },
    ];
    wsResult['!freeze'] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, wsResult, 'نتيجة كل صف');

    // Sheet 2: تفاصيل الأخطاء
    const errHeaders = ['رقم الصف', 'رابط المتجر', 'النوع', 'الحقل', 'الرسالة', 'القيمة'];
    const errRows: unknown[][] = [];
    allRows.forEach(row => {
      const url = row.normalized_row?.store_url ?? '';
      ;[
        ...(row.errors   ?? []).map((e: any) => ({ ...e, type: '✗ خطأ' })),
        ...(row.warnings ?? []).map((w: any) => ({ ...w, type: '⚠ تحذير' })),
      ].forEach(issue => {
        errRows.push([row.row_index, url, issue.type, issue.field ?? '', issue.message ?? '', issue.value ?? '']);
      });
    });
    if (errRows.length > 0) {
      const wsErr = XLSX.utils.aoa_to_sheet([errHeaders, ...errRows]);
      wsErr['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 12 }, { wch: 22 }, { wch: 50 }, { wch: 30 }];
      wsErr['!freeze'] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, wsErr, 'الأخطاء والتحذيرات');
    }

    // Sheet 3: التصحيحات التلقائية
    const fixHeaders = ['رقم الصف', 'رابط المتجر', 'الحقل', 'الإجراء', 'القيمة القديمة', 'القيمة الجديدة'];
    const fixRows: unknown[][] = [];
    allRows.forEach(row => {
      const url = row.normalized_row?.store_url ?? '';
      (row.autofixes ?? []).forEach((fix: any) => {
        fixRows.push([row.row_index, url, fix.field ?? '', fix.action ?? '', fix.old_value ?? '', fix.new_value ?? '']);
      });
    });
    if (fixRows.length > 0) {
      const wsFix = XLSX.utils.aoa_to_sheet([fixHeaders, ...fixRows]);
      wsFix['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 20 }, { wch: 20 }, { wch: 35 }, { wch: 35 }];
      wsFix['!freeze'] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, wsFix, 'التصحيحات التلقائية');
    }

    // Sheet 4: الصفوف المرفوضة (للإعادة)
    const rejectedRows = allRows.filter(r => r.status === 'error');
    if (rejectedRows.length > 0) {
      const rejData = rejectedRows.map(row => normToTemplateRow(row.normalized_row ?? {}));
      const wsRej = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...rejData]);
      wsRej['!cols'] = [
        { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 16 }, { wch: 26 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 30 },
        { wch: 22 }, { wch: 36 }, { wch: 36 }, { wch: 28 },
      ];
      wsRej['!freeze'] = { xSplit: 0, ySplit: 1 };
      XLSX.utils.book_append_sheet(wb, wsRej, 'الصفوف المرفوضة (للإعادة)');
    }

    // Sheet 5: ملخص
    const sumRows = [
      ['📊 تقرير أخطاء الاستيراد'],
      [''],
      ['المصدر',           job.source_name ?? ''],
      ['تاريخ الاستيراد',  new Date(job.created_at).toLocaleString('ar-SA')],
      [''],
      ['إجمالي الصفوف',    job.total_rows],
      ['✓ صالحة',          job.valid_rows],
      ['⚠ تحذيرات',        job.warning_rows],
      ['✗ أخطاء',          job.error_rows],
      ['✓ تم حفظه',        job.committed_rows ?? 0],
      ['— تم تجاهله',      job.skipped_rows   ?? 0],
      [''],
      ['إجمالي الأخطاء',   errRows.filter(r => r[2] === '✗ خطأ').length],
      ['إجمالي التحذيرات', errRows.filter(r => r[2] === '⚠ تحذير').length],
      ['إجمالي التصحيحات', fixRows.length],
    ];
    const wsSum = XLSX.utils.aoa_to_sheet(sumRows);
    wsSum['!cols'] = [{ wch: 22 }, { wch: 30 }];
    wsSum['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    XLSX.utils.book_append_sheet(wb, wsSum, 'ملخص');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `import-errors-${jobId.slice(0, 8)}.xlsx`;
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'خطأ غير متوقع: ' + err.message }, { status: 500 });
  }
}
