import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '../_lib/supabase';
import { normalizeRow } from '../_lib/normalize';
import { parseGoogleSheet, isValidGoogleSheetUrl } from '@/lib/import/parsers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { sheet_url, created_by } = await request.json();

    if (!sheet_url) {
      return NextResponse.json({ error: 'رابط Google Sheet مطلوب' }, { status: 400 });
    }

    if (!isValidGoogleSheetUrl(sheet_url)) {
      return NextResponse.json({ error: 'رابط Google Sheet غير صالح — تأكد أنه يحتوي على /spreadsheets/d/{ID}' }, { status: 400 });
    }

    // ── جلب وتحليل الشيت عبر الـ parser الموحّد ─────────────
    const parsed = await parseGoogleSheet(sheet_url);
    const rawRows = parsed.rows;

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'الشيت فارغ أو لا يحتوي على بيانات' }, { status: 400 });
    }

    // ── إنشاء Job ────────────────────────────────────────────
    const { data: job, error: jobErr } = await supabase
      .from('store_import_jobs')
      .insert({
        created_by:  created_by || null,
        source_type: 'google_sheet',
        source_name: `Google Sheet (${parsed.sheetId})`,
        source_url:  sheet_url,
        status:      'uploaded',
        total_rows:  rawRows.length,
      })
      .select()
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: 'فشل إنشاء وظيفة الاستيراد: ' + jobErr?.message }, { status: 500 });
    }

    // ── تطبيع وتحقق من كل صف ────────────────────────────────
    let validCount = 0, warningCount = 0, errorCount = 0;

    const rowsToInsert = rawRows.map((raw, idx) => {
      const { normalized, errors, warnings, autofixes } = normalizeRow(raw);

      let rowStatus: string;
      if (errors.length > 0)        { rowStatus = 'error';   errorCount++;   }
      else if (warnings.length > 0) { rowStatus = 'warning'; warningCount++; }
      else                          { rowStatus = 'valid';   validCount++;   }

      return {
        job_id:         job.id,
        row_index:      idx + 1,
        raw_row:        raw,
        normalized_row: normalized,
        status:         rowStatus,
        errors,
        warnings,
        autofixes,
      };
    });

    const { error: rowsErr } = await supabase
      .from('store_import_rows')
      .insert(rowsToInsert);

    if (rowsErr) {
      await supabase.from('store_import_jobs').update({ status: 'failed', error_message: rowsErr.message }).eq('id', job.id);
      return NextResponse.json({ error: 'فشل حفظ صفوف الاستيراد: ' + rowsErr.message }, { status: 500 });
    }

    await supabase
      .from('store_import_jobs')
      .update({
        status:       'validated',
        valid_rows:   validCount,
        warning_rows: warningCount,
        error_rows:   errorCount,
        parsed_at:    new Date().toISOString(),
        validated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return NextResponse.json({
      success:  true,
      job_id:   job.id,
      total:    rawRows.length,
      valid:    validCount,
      warnings: warningCount,
      errors:   errorCount,
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'خطأ غير متوقع: ' + err.message }, { status: 500 });
  }
}
