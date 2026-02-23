/**
 * Token Encryption Utility
 * تشفير وفك تشفير التوكنات باستخدام AES-256-GCM
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY
           || process.env.META_TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set');
  }
  // نقبل مفتاح نصي عادي (32+ حرف) أو base64
  const buf = Buffer.from(key, 'utf8');
  if (buf.length >= 32) return buf.subarray(0, 32);
  // إذا أقصر من 32 — نمدّه بـ SHA-256
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * تشفير نص
 * @param plaintext النص المراد تشفيره
 * @returns النص المشفر (base64)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // نجمع: IV + AuthTag + EncryptedData
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64')
  ]);
  
  return combined.toString('base64');
}

/**
 * فك تشفير نص
 * @param encryptedText النص المشفر (base64)
 * @returns النص الأصلي
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedText, 'base64');
  
  // استخراج: IV + AuthTag + EncryptedData
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted.toString('base64'), 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * توليد مفتاح تشفير جديد (للاستخدام مرة واحدة عند الإعداد)
 * @returns مفتاح base64 encoded
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}
