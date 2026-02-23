import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get('s') || '9172d3a8-05cd-4143-b0bf-9514cc1e3fd6';
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // حذف سجل Snapchat القديم
  const { error } = await supabase
    .from('ad_platform_accounts')
    .delete()
    .eq('store_id', storeId)
    .eq('platform', 'snapchat');

  if (error) return NextResponse.json({ error: error.message });
  return NextResponse.json({ success: true, message: 'Snapchat record deleted. Please reconnect.' });
}
