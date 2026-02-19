/**
 * POST /api/admin/stores/[id]/logo
 * يجلب شعار المتجر من Google Favicons ويحفظه في Supabase Storage
 * ثم يحدّث logo_url و logo_path و logo_status في جدول stores
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const BUCKET = 'store-logos';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

function cleanDomain(url: string) {
  return url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .toLowerCase();
}

/** محاولة جلب الشعار من مصادر متعددة بالترتيب */
async function fetchLogoBuffer(domain: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const sources = [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://${domain}/favicon.ico`,
    `https://${domain}/favicon.png`,
  ];

  for (const src of sources) {
    try {
      const res = await fetch(src, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!res.ok) continue;

      const contentType = res.headers.get('content-type') || 'image/x-icon';
      // تجاهل HTML أو نصوص
      if (contentType.startsWith('text/')) continue;

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // تجاهل الملفات الصغيرة جداً (أقل من 100 بايت — غالباً placeholder)
      if (buffer.length < 100) continue;

      return { buffer, contentType };
    } catch {
      continue;
    }
  }
  return null;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) return NextResponse.json({ error: 'Store ID required' }, { status: 400 });

  const supabase = getAdminClient();

  // جلب بيانات المتجر
  const { data: store, error: storeErr } = await supabase
    .from('stores')
    .select('id, store_url, logo_status, logo_url')
    .eq('id', id)
    .single();

  if (storeErr || !store) {
    return NextResponse.json({ error: 'Store not found' }, { status: 404 });
  }

  // إذا كان الشعار جاهزاً مسبقاً → أعد الرابط مباشرة
  if (store.logo_status === 'ready' && store.logo_url) {
    return NextResponse.json({ logo_url: store.logo_url, cached: true });
  }

  const domain = cleanDomain(store.store_url);
  const result = await fetchLogoBuffer(domain);

  if (!result) {
    // سجّل الفشل
    await supabase
      .from('stores')
      .update({ logo_status: 'failed' })
      .eq('id', id);
    return NextResponse.json({ error: 'Logo not found', logo_url: null }, { status: 404 });
  }

  const { buffer, contentType } = result;
  const ext = contentType.includes('png') ? 'png' : contentType.includes('svg') ? 'svg' : 'ico';
  const path = `${id}.${ext}`;

  // رفع الملف إلى Storage
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: true,
      cacheControl: '31536000', // سنة كاملة
    });

  if (uploadErr) {
    await supabase.from('stores').update({ logo_status: 'failed' }).eq('id', id);
    return NextResponse.json({ error: 'Upload failed: ' + uploadErr.message }, { status: 500 });
  }

  // جلب الرابط العام
  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const logo_url = publicData.publicUrl;

  // تحديث جدول stores
  await supabase
    .from('stores')
    .update({ logo_status: 'ready', logo_path: path, logo_url })
    .eq('id', id);

  return NextResponse.json({ logo_url, cached: false });
}
