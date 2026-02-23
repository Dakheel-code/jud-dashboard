import { NextResponse } from 'next/server';
import { encrypt, decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const testText = 'hello_snapchat_test_123';
    const encrypted = encrypt(testText);
    const decrypted = decrypt(encrypted);
    const keyEnv = process.env.TOKEN_ENCRYPTION_KEY || process.env.META_TOKEN_ENCRYPTION_KEY || '';
    return NextResponse.json({
      encrypt_decrypt_works: decrypted === testText,
      key_length: keyEnv.length,
      key_prefix: keyEnv.substring(0, 8) + '...',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
