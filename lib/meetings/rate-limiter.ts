/**
 * Rate Limiter لحماية الـ APIs العامة
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials missing');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // بالميلي ثانية
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // ساعة واحدة
};

/**
 * التحقق من Rate Limit
 */
export async function checkRateLimit(
  ipAddress: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}> {
  const supabase = getSupabase();
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);
  
  // حذف السجلات القديمة
  await supabase
    .from('meeting_rate_limits')
    .delete()
    .lt('window_end', now.toISOString());
  
  // جلب السجل الحالي
  const { data: existing } = await supabase
    .from('meeting_rate_limits')
    .select('*')
    .eq('ip_address', ipAddress)
    .gte('window_end', now.toISOString())
    .single();
  
  if (existing) {
    // تحديث العداد
    if (existing.request_count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(existing.window_end),
      };
    }
    
    await supabase
      .from('meeting_rate_limits')
      .update({ request_count: existing.request_count + 1 })
      .eq('id', existing.id);
    
    return {
      allowed: true,
      remaining: config.maxRequests - existing.request_count - 1,
      resetAt: new Date(existing.window_end),
    };
  }
  
  // إنشاء سجل جديد
  const windowEnd = new Date(now.getTime() + config.windowMs);
  
  await supabase
    .from('meeting_rate_limits')
    .insert({
      ip_address: ipAddress,
      request_count: 1,
      window_start: now.toISOString(),
      window_end: windowEnd.toISOString(),
    });
  
  return {
    allowed: true,
    remaining: config.maxRequests - 1,
    resetAt: windowEnd,
  };
}

/**
 * التحقق من Turnstile/reCAPTCHA
 */
export async function verifyTurnstile(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY || process.env.RECAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.warn('No CAPTCHA secret key configured, skipping verification');
    return true; // السماح إذا لم يكن مُعداً
  }
  
  try {
    // Cloudflare Turnstile
    if (process.env.TURNSTILE_SECRET_KEY) {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
        }),
      });
      
      const data = await response.json();
      return data.success === true;
    }
    
    // Google reCAPTCHA
    if (process.env.RECAPTCHA_SECRET_KEY) {
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: secretKey,
          response: token,
        }),
      });
      
      const data = await response.json();
      return data.success === true && (data.score === undefined || data.score >= 0.5);
    }
    
    return true;
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return false;
  }
}

/**
 * جلب IP من الـ request
 */
export function getClientIP(request: Request): string {
  // Cloudflare
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) return cfIP;
  
  // X-Forwarded-For
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  // X-Real-IP
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  
  return '127.0.0.1';
}
