import { NextRequest, NextResponse } from 'next/server';
import { buildTikTokAuthUrl } from '@/lib/tiktok';

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('store_id');

  if (!storeId) {
    return NextResponse.json({ error: 'store_id مطلوب' }, { status: 400 });
  }

  try {
    const authUrl = buildTikTokAuthUrl(storeId);
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('[TikTok Auth] خطأ في بناء رابط المصادقة:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
