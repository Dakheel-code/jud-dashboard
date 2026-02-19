/**
 * CSV / TSV Parser
 * يدعم:
 *   - CSV  (فاصلة)
 *   - TSV  (tab)
 *   - CSV بفاصلة منقوطة (;) — شائع في Excel العربي
 *   - ترميز UTF-8 و UTF-8 BOM
 */

export interface ParseResult {
  rows: Record<string, unknown>[];
  totalRows: number;
  delimiter: string;
}

// اكتشاف الفاصل تلقائياً من أول سطر
function detectDelimiter(firstLine: string): string {
  const counts: Record<string, number> = {
    ',':  (firstLine.match(/,/g)  ?? []).length,
    '\t': (firstLine.match(/\t/g) ?? []).length,
    ';':  (firstLine.match(/;/g)  ?? []).length,
    '|':  (firstLine.match(/\|/g) ?? []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// إزالة BOM إذا وجد
function stripBOM(text: string): string {
  return text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
}

// تحليل سطر CSV مع دعم القيم المحاطة بعلامات اقتباس
function parseLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * يقرأ نص CSV/TSV ويعيد مصفوفة من الكائنات
 */
export function parseCSVText(text: string): ParseResult {
  const clean = stripBOM(text);

  // تقسيم الأسطر مع دعم \r\n و \n
  const lines = clean.split(/\r?\n/).filter(l => l.trim() !== '');

  if (lines.length < 2) {
    throw new Error('الملف لا يحتوي على بيانات كافية (يحتاج صف ترويسة + صف بيانات على الأقل)');
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers   = parseLine(lines[0], delimiter);

  if (headers.length === 0 || headers.every(h => h === '')) {
    throw new Error('لم يتم العثور على ترويسة الأعمدة في الملف');
  }

  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i], delimiter);

    // تجاهل الصفوف الفارغة تماماً
    if (values.every(v => v === '')) continue;

    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      if (header) row[header] = values[idx] ?? '';
    });
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new Error('الملف فارغ أو لا يحتوي على بيانات');
  }

  return { rows, totalRows: rows.length, delimiter };
}

/**
 * يقرأ ArrayBuffer (من File.arrayBuffer()) ويحوله لنص ثم يحلله
 * يجرب UTF-8 أولاً ثم Windows-1256 (عربي)
 */
export function parseCSVBuffer(buffer: ArrayBuffer): ParseResult {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    // fallback لـ Windows-1256 (ترميز Excel العربي القديم)
    text = new TextDecoder('windows-1256').decode(buffer);
  }
  return parseCSVText(text);
}
