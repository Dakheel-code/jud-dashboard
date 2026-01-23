/**
 * تشفير وفك تشفير البيانات الحساسة
 * يستخدم AES-256-GCM للتشفير
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// مفتاح التشفير من متغيرات البيئة
const DEFAULT_SECRET = 'jud-dashboard-default-secret-key-2026';

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || process.env.MEETING_JWT_SECRET || DEFAULT_SECRET;
  // تحويل المفتاح إلى 32 bytes باستخدام SHA-256
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * تشفير نص
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // دمج IV + AuthTag + Encrypted في سلسلة واحدة
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

/**
 * فك تشفير نص
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * إنشاء token آمن
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * إنشاء JWT بسيط للاجتماعات
 */
export function createMeetingToken(payload: {
  meeting_id: string;
  client_email: string;
  action: 'view' | 'reschedule' | 'cancel';
  expires_in_days?: number;
}): string {
  const secret = process.env.MEETING_JWT_SECRET || DEFAULT_SECRET;

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = (payload.expires_in_days || 30) * 24 * 60 * 60;
  
  const payloadData = {
    meeting_id: payload.meeting_id,
    client_email: payload.client_email,
    action: payload.action,
    iat: now,
    exp: now + expiresIn,
  };
  
  const payloadBase64 = Buffer.from(JSON.stringify(payloadData)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payloadBase64}`)
    .digest('base64url');
  
  return `${header}.${payloadBase64}.${signature}`;
}

/**
 * التحقق من JWT الاجتماعات
 */
export function verifyMeetingToken(token: string): {
  valid: boolean;
  payload?: {
    meeting_id: string;
    client_email: string;
    action: 'view' | 'reschedule' | 'cancel';
    iat: number;
    exp: number;
  };
  error?: string;
} {
  const secret = process.env.MEETING_JWT_SECRET || DEFAULT_SECRET;

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid token format' };
  }

  const [header, payloadBase64, signature] = parts;

  // التحقق من التوقيع
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${payloadBase64}`)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid signature' };
  }

  // فك تشفير الـ payload
  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString());
    
    // التحقق من انتهاء الصلاحية
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Invalid payload' };
  }
}

/**
 * Hash للـ idempotency key
 */
export function hashIdempotencyKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}
