import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // جلب كل سجلات google_ads_connections
  const { data: all } = await supabase
    .from('google_ads_connections')
    .select('id, store_id, customer_id, customer_name, is_active, connected_at')
    .order('connected_at', { ascending: false })
    .limit(20);

  return NextResponse.json({ all_records: all ?? [] });
}
