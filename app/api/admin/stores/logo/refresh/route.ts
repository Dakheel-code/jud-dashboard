/**
 * POST /api/admin/stores/logo/refresh
 * يجلب شعار المتجر ويحفظه في Supabase Storage
 *
 * ترتيب المصادر:
 *  1. HTML parsing: <link rel="icon">, <link rel="apple-touch-icon">, <meta og:image>
 *  2. Fallback: Google S2 Favicons API
 *
 * يحفظ الصورة كـ WebP أو PNG في store-logos/{storeId}.webp
 * يستخدم Service Role فقط — لا ANON_KEY
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BUCKET = 'store-logos';
const TIMEOUT_MS = 8000;

// ── Supabase Admin Client (Service Role) ─────────────────────
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── تنظيف الدومين ─────────────────────────────────────────────
function cleanDomain(url: string): string {
  return url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .toLowerCase()
    .trim();
}

function toAbsoluteUrl(href: string, baseUrl: string): string {
  if (!href) return '';
  if (href.startsWith('http')) return href;
  if (href.startsWith('//')) return 'https:' + href;
  if (href.startsWith('/')) {
    const base = new URL(baseUrl);
    return `${base.protocol}//${base.host}${href}`;
  }
  return baseUrl.replace(/\/$/, '') + '/' + href;
}

// ── جلب URL الشعار من HTML ────────────────────────────────────
async function extractLogoUrlFromHtml(storeUrl: string): Promise<string | null> {
  const siteUrl = storeUrl.startsWith('http') ? storeUrl : `https://${storeUrl}`;
  try {
    const res = await fetch(siteUrl, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LogoBot/1.0)' },
    });
    if (!res.ok) return null;

    const html = await res.text();

    // 1. apple-touch-icon (أعلى جودة)
    const appleMatch = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i)
                    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i);
    if (appleMatch?.[1]) return toAbsoluteUrl(appleMatch[1], siteUrl);

    // 2. icon بحجم كبير
    const iconMatches = [...html.matchAll(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["'][^>]*sizes=["']([^"']+)["']/gi)];
    if (iconMatches.length > 0) {
      const sorted = iconMatches
        .map(m => ({ href: m[1], size: parseInt(m[2]?.split('x')[0] || '0') }))
        .sort((a, b) => b.size - a.size);
      if (sorted[0]?.href) return toAbsoluteUrl(sorted[0].href, siteUrl);
    }

    // 3. أي icon
    const iconMatch = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i)
                   || html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["'][^"']*icon[^"']*["']/i);
    if (iconMatch?.[1]) return toAbsoluteUrl(iconMatch[1], siteUrl);

    // 4. og:image
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
                 || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    if (ogMatch?.[1]) return toAbsoluteUrl(ogMatch[1], siteUrl);

  } catch {
    return null;
  }
  return null;
}

// ── تنزيل الصورة ─────────────────────────────────────────────
async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LogoBot/1.0)' },
    });
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || 'image/png';
    if (contentType.startsWith('text/') || contentType.includes('html')) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) return null; // صورة فارغة
    if (buffer.length > 5 * 1024 * 1024) return null; // أكبر من 5MB

    return { buffer, contentType };
  } catch {
    return null;
  }
}

// ── تحديد الامتداد ───────────────────────────────────────────
function getExtension(contentType: string, url: string): string {
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('svg')) return 'svg';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (url.endsWith('.webp')) return 'webp';
  if (url.endsWith('.png')) return 'png';
  if (url.endsWith('.svg')) return 'svg';
  return 'png'; // افتراضي
}

// ── Handler الرئيسي ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  let storeId: string, storeUrl: string;

  try {
    const body = await req.json();
    storeId  = body.storeId?.trim();
    storeUrl = body.storeUrl?.trim();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!storeId || !storeUrl) {
    return NextResponse.json({ error: 'storeId و storeUrl مطلوبان' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const domain   = cleanDomain(storeUrl);

  // ── الخطوة 1: استخراج URL الشعار من HTML ─────────────────
  let logoSourceUrl: string | null = await extractLogoUrlFromHtml(storeUrl);

  // ── الخطوة 2: Fallback → Google S2 ──────────────────────
  if (!logoSourceUrl) {
    logoSourceUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }

  // ── الخطوة 3: تنزيل الصورة ───────────────────────────────
  const downloaded = await downloadImage(logoSourceUrl);

  if (!downloaded) {
    await supabase.from('stores').update({
      logo_status:     'failed',
      logo_error:      `فشل تنزيل الشعار من: ${logoSourceUrl}`,
      logo_updated_at: new Date().toISOString(),
    }).eq('id', storeId);

    return NextResponse.json({ error: 'فشل تنزيل الشعار', logo_url: null }, { status: 422 });
  }

  const { buffer, contentType } = downloaded;
  const ext  = getExtension(contentType, logoSourceUrl);
  const path = `${storeId}.${ext}`;

  // ── الخطوة 4: رفع إلى Supabase Storage ───────────────────
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert:       true,        // الكتابة فوق الملف القديم
      cacheControl: '31536000',  // cache سنة كاملة
    });

  if (uploadErr) {
    await supabase.from('stores').update({
      logo_status:     'failed',
      logo_error:      `فشل الرفع: ${uploadErr.message}`,
      logo_updated_at: new Date().toISOString(),
    }).eq('id', storeId);

    return NextResponse.json({ error: 'فشل رفع الشعار: ' + uploadErr.message }, { status: 500 });
  }

  // ── الخطوة 5: جلب رابط CDN ───────────────────────────────
  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const logo_url = publicData.publicUrl;

  // ── الخطوة 6: تحديث DB ───────────────────────────────────
  await supabase.from('stores').update({
    logo_url,
    logo_path:       path,
    logo_source_url: logoSourceUrl,
    logo_status:     'ready',
    logo_updated_at: new Date().toISOString(),
    logo_error:      null,
  }).eq('id', storeId);

  return NextResponse.json({
    success:          true,
    logo_url,
    logo_path:        path,
    logo_source_url:  logoSourceUrl,
  });
}
