/**
 * Excel Parser (xlsx / xls)
 * يستخدم SheetJS لقراءة ملفات Excel وتحويلها لمصفوفة من الكائنات
 */

export interface ParseResult {
  rows: Record<string, unknown>[];
  sheetName: string;
  totalRows: number;
}

export interface ParseError {
  message: string;
}

/**
 * يقرأ ملف Excel (ArrayBuffer) ويعيد الصفوف من أول ورقة تحتوي بيانات
 */
export async function parseExcel(buffer: ArrayBuffer): Promise<ParseResult> {
  const XLSX = await import('xlsx');

  const workbook = XLSX.read(buffer, {
    type:     'array',
    codepage: 65001,   // UTF-8
    raw:      false,
    cellDates: true,   // تحويل التواريخ تلقائياً
  });

  if (workbook.SheetNames.length === 0) {
    throw new Error('الملف لا يحتوي على أي أوراق');
  }

  // ابحث عن أول ورقة تحتوي بيانات (تجاهل أوراق التعليمات الفارغة)
  let targetSheet = workbook.SheetNames[0];
  let targetWorksheet = workbook.Sheets[targetSheet];

  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name];
    const ref = ws['!ref'];
    if (ref && ref !== 'A1') {
      targetSheet = name;
      targetWorksheet = ws;
      break;
    }
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    targetWorksheet,
    {
      defval:   '',
      raw:      false,
      dateNF:   'YYYY-MM-DD',
    }
  );

  // تنظيف: إزالة الصفوف الفارغة تماماً
  const cleanRows = rows.filter(row =>
    Object.values(row).some(v => v !== '' && v != null)
  );

  if (cleanRows.length === 0) {
    throw new Error('الملف فارغ أو لا يحتوي على بيانات');
  }

  return {
    rows:      cleanRows,
    sheetName: targetSheet,
    totalRows: cleanRows.length,
  };
}
