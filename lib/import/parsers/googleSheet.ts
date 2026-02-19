/**
 * Google Sheet Parser
 * يدعم:
 *   - رابط مشاركة عادي (Anyone with link can view)
 *   - رابط تعديل
 *   - رابط CSV export مباشر
 *   - استخراج gid (رقم الورقة) من الرابط
 */

import { parseCSVText, ParseResult } from './csv';

export interface SheetInfo {
  sheetId: string;
  gid: string;
  csvUrl: string;
}

// ── استخراج معلومات الشيت من الرابط ─────────────────────────────────────────

export function extractSheetInfo(url: string): SheetInfo {
  const trimmed = url.trim();

  // استخراج Sheet ID
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) {
    throw new Error('رابط Google Sheet غير صالح — تأكد أنه يحتوي على /spreadsheets/d/{ID}');
  }
  const sheetId = idMatch[1];

  // استخراج gid (رقم الورقة الفرعية)
  const gidMatch = trimmed.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch?.[1] ?? '0';

  // بناء رابط CSV export
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  return { sheetId, gid, csvUrl };
}

// ── جلب وتحليل Google Sheet ──────────────────────────────────────────────────

export interface GoogleSheetResult extends ParseResult {
  sheetId: string;
  gid: string;
  csvUrl: string;
}

export async function parseGoogleSheet(sheetUrl: string): Promise<GoogleSheetResult> {
  const { sheetId, gid, csvUrl } = extractSheetInfo(sheetUrl);

  // جلب البيانات كـ CSV
  let response: Response;
  try {
    response = await fetch(csvUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StoreImporter/1.0)',
        'Accept':     'text/csv,text/plain,*/*',
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err: any) {
    if (err.name === 'TimeoutError') {
      throw new Error('انتهت مهلة الاتصال بـ Google Sheets — تحقق من اتصالك بالإنترنت');
    }
    throw new Error(`فشل الاتصال بـ Google Sheets: ${err.message}`);
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('الشيت غير مشارك للعموم — افتح الشيت وغيّر الإعداد إلى "Anyone with the link can view"');
  }

  if (response.status === 404) {
    throw new Error('الشيت غير موجود — تحقق من الرابط');
  }

  if (!response.ok) {
    throw new Error(`فشل جلب الشيت (HTTP ${response.status})`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  // Google أحياناً يعيد HTML بدل CSV إذا الشيت محمي
  if (contentType.includes('text/html')) {
    throw new Error('الشيت يتطلب تسجيل دخول — تأكد أنه مشارك للعموم بدون حساب');
  }

  const csvText = await response.text();

  if (!csvText.trim()) {
    throw new Error('الشيت فارغ');
  }

  const parsed = parseCSVText(csvText);

  return {
    ...parsed,
    sheetId,
    gid,
    csvUrl,
  };
}

// ── التحقق من صحة الرابط (بدون جلب) ────────────────────────────────────────

export function isValidGoogleSheetUrl(url: string): boolean {
  return /docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/.test(url);
}
