/**
 * Snapchat API URL Builder with Validation
 * دالة موحدة لبناء URL مع التحقق من صحته
 */

const SNAPCHAT_BASE = 'https://adsapi.snapchat.com';
const API_VERSION = '/v1';

/**
 * التحقق من صحة Ad Account ID
 * يجب أن يكون UUID أو معرف رقمي، وليس اسم
 */
export function validateAdAccountId(adAccountId: string): {
  valid: boolean;
  error?: string;
  error_code?: 'INVALID_AD_ACCOUNT_ID';
} {
  if (!adAccountId || adAccountId.trim() === '') {
    return {
      valid: false,
      error: 'Ad Account ID is empty',
      error_code: 'INVALID_AD_ACCOUNT_ID',
    };
  }

  // التحقق من وجود أحرف غير متوقعة (أقواس، مسافات كثيرة)
  if (adAccountId.includes('(') || adAccountId.includes(')')) {
    return {
      valid: false,
      error: `Ad Account ID contains invalid characters: "${adAccountId}". This looks like a name, not an ID.`,
      error_code: 'INVALID_AD_ACCOUNT_ID',
    };
  }

  // التحقق من المسافات الكثيرة (أكثر من مسافة واحدة متتالية أو مسافات في البداية/النهاية)
  if (adAccountId.trim() !== adAccountId || /\s{2,}/.test(adAccountId) || adAccountId.includes(' ')) {
    return {
      valid: false,
      error: `Ad Account ID contains spaces: "${adAccountId}". This looks like a name, not an ID.`,
      error_code: 'INVALID_AD_ACCOUNT_ID',
    };
  }

  // التحقق من أن الـ ID يبدو كـ UUID أو معرف صالح (أحرف وأرقام وشرطات فقط)
  const validIdPattern = /^[a-zA-Z0-9\-_]+$/;
  if (!validIdPattern.test(adAccountId)) {
    return {
      valid: false,
      error: `Ad Account ID has invalid format: "${adAccountId}". Expected alphanumeric ID.`,
      error_code: 'INVALID_AD_ACCOUNT_ID',
    };
  }

  return { valid: true };
}

export interface UrlBuildResult {
  success: boolean;
  final_url: string;
  computed_base_url: string;
  computed_version: string;
  computed_path: string;
  query_string: string;
  error?: string;
  error_code?: 'INVALID_URL_COMPOSITION' | 'DOUBLE_VERSION' | 'INVALID_BASE';
}

export interface DebugInfo {
  final_url: string;
  computed_base_url: string;
  computed_path: string;
  ad_account_id_used: string;
  sanitized_headers: Record<string, string>;
  url_validation: UrlBuildResult;
}

/**
 * بناء URL صحيح لـ Snapchat API
 */
export function buildSnapchatUrl(
  resource: string,
  queryParams?: Record<string, string>
): UrlBuildResult {
  // تنظيف المسار
  let cleanPath = resource;
  
  // إزالة أي / في البداية
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }
  
  // إزالة v1 إذا كانت موجودة في المسار
  if (cleanPath.startsWith('v1/')) {
    cleanPath = cleanPath.substring(3);
  }
  
  // إزالة أي / مكررة
  cleanPath = cleanPath.replace(/\/+/g, '/');
  
  // بناء URL النهائي
  const path = `/${cleanPath}`;
  const baseWithVersion = `${SNAPCHAT_BASE}${API_VERSION}`;
  let finalUrl = `${baseWithVersion}${path}`;
  
  // إضافة query parameters
  let queryString = '';
  if (queryParams && Object.keys(queryParams).length > 0) {
    queryString = '?' + new URLSearchParams(queryParams).toString();
    finalUrl += queryString;
  }
  
  // التحقق من صحة URL
  const validation = validateSnapchatUrl(finalUrl);
  
  return {
    success: validation.valid,
    final_url: finalUrl,
    computed_base_url: SNAPCHAT_BASE,
    computed_version: API_VERSION,
    computed_path: path,
    query_string: queryString,
    error: validation.error,
    error_code: validation.error_code,
  };
}

/**
 * التحقق من صحة URL
 */
function validateSnapchatUrl(url: string): {
  valid: boolean;
  error?: string;
  error_code?: 'INVALID_URL_COMPOSITION' | 'DOUBLE_VERSION' | 'INVALID_BASE';
} {
  // التحقق من عدم وجود //v1
  if (url.includes('//v1')) {
    return {
      valid: false,
      error: 'URL contains //v1 (double slash before version)',
      error_code: 'INVALID_URL_COMPOSITION',
    };
  }
  
  // التحقق من عدم وجود v1/v1
  if (url.includes('v1/v1')) {
    return {
      valid: false,
      error: 'URL contains v1/v1 (duplicate version)',
      error_code: 'DOUBLE_VERSION',
    };
  }
  
  // التحقق من أن URL يبدأ بالشكل الصحيح
  if (!url.startsWith('https://adsapi.snapchat.com/v1/')) {
    return {
      valid: false,
      error: `URL must start with https://adsapi.snapchat.com/v1/, got: ${url.substring(0, 50)}...`,
      error_code: 'INVALID_BASE',
    };
  }
  
  return { valid: true };
}

/**
 * بناء debug info للـ response
 */
export function createDebugInfo(
  urlResult: UrlBuildResult,
  adAccountId: string,
  headers: Record<string, string>
): DebugInfo {
  // إزالة Authorization من headers
  const sanitizedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'authorization') {
      sanitizedHeaders[key] = 'Bearer [REDACTED]';
    } else {
      sanitizedHeaders[key] = value;
    }
  }
  
  return {
    final_url: urlResult.final_url,
    computed_base_url: urlResult.computed_base_url,
    computed_path: urlResult.computed_path,
    ad_account_id_used: adAccountId,
    sanitized_headers: sanitizedHeaders,
    url_validation: urlResult,
  };
}
