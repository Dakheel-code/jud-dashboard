/**
 * Unified Parser Entry Point
 * يكتشف نوع الملف تلقائياً ويستدعي الـ parser المناسب
 */

export { parseExcel }                           from './excel';
export { parseCSVBuffer, parseCSVText }         from './csv';
export { parseGoogleSheet, isValidGoogleSheetUrl, extractSheetInfo } from './googleSheet';
export type { ParseResult as ExcelParseResult } from './excel';
export type { ParseResult as CSVParseResult }   from './csv';
export type { GoogleSheetResult }               from './googleSheet';

export interface UnifiedParseResult {
  rows:      Record<string, unknown>[];
  totalRows: number;
  sourceType: 'excel' | 'csv' | 'tsv' | 'google_sheet';
  meta?: Record<string, unknown>;
}

/**
 * يقرأ ملف (File object) ويعيد الصفوف بغض النظر عن نوعه
 */
export async function parseFile(file: File): Promise<UnifiedParseResult> {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const { parseExcel } = await import('./excel');
    const result = await parseExcel(buffer);
    return {
      rows:       result.rows,
      totalRows:  result.totalRows,
      sourceType: 'excel',
      meta:       { sheetName: result.sheetName },
    };
  }

  if (name.endsWith('.csv')) {
    const { parseCSVBuffer } = await import('./csv');
    const result = parseCSVBuffer(buffer);
    return {
      rows:       result.rows,
      totalRows:  result.totalRows,
      sourceType: 'csv',
      meta:       { delimiter: result.delimiter },
    };
  }

  if (name.endsWith('.tsv') || name.endsWith('.txt')) {
    const { parseCSVBuffer } = await import('./csv');
    const result = parseCSVBuffer(buffer);
    return {
      rows:       result.rows,
      totalRows:  result.totalRows,
      sourceType: 'tsv',
      meta:       { delimiter: result.delimiter },
    };
  }

  throw new Error(`نوع الملف غير مدعوم: ${file.name} — يدعم النظام: xlsx, xls, csv, tsv`);
}

/**
 * يقرأ ArrayBuffer مع تحديد نوع الملف يدوياً
 */
export async function parseBuffer(
  buffer: ArrayBuffer,
  mimeType: string,
  fileName: string
): Promise<UnifiedParseResult> {
  const name = fileName.toLowerCase();

  if (name.endsWith('.xlsx') || name.endsWith('.xls') ||
      mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    const { parseExcel } = await import('./excel');
    const result = await parseExcel(buffer);
    return { rows: result.rows, totalRows: result.totalRows, sourceType: 'excel', meta: { sheetName: result.sheetName } };
  }

  const { parseCSVBuffer } = await import('./csv');
  const result = parseCSVBuffer(buffer);
  const sourceType = result.delimiter === '\t' ? 'tsv' : 'csv';
  return { rows: result.rows, totalRows: result.totalRows, sourceType, meta: { delimiter: result.delimiter } };
}
