/**
 * Meta Token Encryption — AES-256-GCM
 * يستخدم META_TOKEN_ENCRYPTION_KEY المنفصل عن مفتاح التشفير العام
 */

import crypto from 'crypto';

const ALGORITHM      = 'aes-256-gcm';
const IV_LENGTH      = 16;
const AUTH_TAG_LEN   = 16;
const KEY_LENGTH     = 32;

function getKey(): Buffer {
  const raw = process.env.META_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error('META_TOKEN_ENCRYPTION_KEY is not set');
  // نقبل مفتاح نصي عادي (32 حرف) أو base64
  const buf = Buffer.from(raw, 'utf8');
  if (buf.length >= KEY_LENGTH) return buf.subarray(0, KEY_LENGTH);
  // إذا أقصر — نمدّه بـ SHA-256
  return crypto.createHash('sha256').update(raw).digest();
}

export function encryptToken(plaintext: string): string {
  if (!plaintext) return '';
  const key = getKey();
  const iv  = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let enc = cipher.update(plaintext, 'utf8', 'base64');
  enc += cipher.final('base64');
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, Buffer.from(enc, 'base64')]).toString('base64');
}

export function decryptToken(ciphertext: string): string {
  if (!ciphertext) return '';
  const key  = getKey();
  const buf  = Buffer.from(ciphertext, 'base64');
  const iv   = buf.subarray(0, IV_LENGTH);
  const tag  = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LEN);
  const enc  = buf.subarray(IV_LENGTH + AUTH_TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let dec = decipher.update(enc.toString('base64'), 'base64', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}
