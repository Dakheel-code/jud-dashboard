import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '../_lib/supabase';
import { normalizeRow } from '../_lib/normalize';
import { parseBuffer } from '@/lib/import/parsers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const createdBy = formData.get('created_by') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'لم يتم إرفاق ملف' }, { status: 400 });
    }

    const SUPPORTED = ['.xlsx', '.xls', '.csv', '.tsv', '.txt'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED.includes(ext)) {
      return NextResponse.json(
        { error: `نوع الملف غير مدعوم (${ext}) — يدعم النظام: xlsx, xls, csv, tsv` },
        { status: 400 }
      );
    }

    // ── قراءة الملف باستخدام الـ parser الموحّد ─────────────
    const buffer = await file.arrayBuffer();
    const parsed = await parseBuffer(buffer, file.type, file.name);
    const rawRows = parsed.rows;

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'الملف فارغ أو لا يحتوي على بيانات' }, { status: 400 });
    }

    // ── إنشاء Job ────────────────────────────────────────────
    const { data: job, error: jobErr } = await supabase
      .from('store_import_jobs')
      .insert({
        created_by:  createdBy || null,
        source_type: parsed.sourceType,
        source_name: file.name,
        status:      'uploaded',
        total_rows:  rawRows.length,
      })
      .select()
      .single();

    if (jobErr || !job) {
      return NextResponse.json({ error: 'فشل إنشاء وظيفة الاستيراد: ' + jobErr?.message }, { status: 500 });
    }

    // ── تطبيع وتحقق من كل صف ────────────────────────────────
    let validCount   = 0;
    let warningCount = 0;
    let errorCount   = 0;

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
        errors:         errors,
        warnings:       warnings,
        autofixes:      autofixes,
      };
    });

    // ── حفظ الصفوف دفعة واحدة ───────────────────────────────
    const { error: rowsErr } = await supabase
      .from('store_import_rows')
      .insert(rowsToInsert);

    if (rowsErr) {
      await supabase.from('store_import_jobs').update({ status: 'failed', error_message: rowsErr.message }).eq('id', job.id);
      return NextResponse.json({ error: 'فشل حفظ صفوف الاستيراد: ' + rowsErr.message }, { status: 500 });
    }

    // ── تحديث إحصائيات الـ Job ───────────────────────────────
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
      success:   true,
      job_id:    job.id,
      total:     rawRows.length,
      valid:     validCount,
      warnings:  warningCount,
      errors:    errorCount,
    });

  } catch (err: any) {
    return NextResponse.json({ error: 'خطأ غير متوقع: ' + err.message }, { status: 500 });
  }
}
