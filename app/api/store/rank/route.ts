import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const storeId = searchParams.get('store_id');

  if (!storeId) {
    return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // محاولة استخدام RPC (أسرع — صف واحد فقط)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_store_rank', {
      target_store_id: storeId
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      const row = rpcData[0];
      return NextResponse.json({
        rank: row.rank,
        total_stores: row.total_stores,
        completion_percentage: row.completion_percentage,
        is_top_3: row.rank <= 3,
        is_first: row.rank === 1
      }, {
        headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' }
      });
    }

    // Fallback: حساب يدوي بدون O(n²) — باستخدام aggregation
    const [storesResult, tasksCountResult, progressResult] = await Promise.all([
      supabase.from('stores').select('id', { count: 'exact' }),
      supabase.from('tasks').select('id', { count: 'exact', head: true }),
      supabase.rpc('get_store_completed_counts')
    ]);

    const totalStores = storesResult.count || 0;
    const totalTasks = tasksCountResult.count || 0;

    // بناء map وترتيب
    const completions: { id: string; pct: number }[] = [];
    if (progressResult.data) {
      const storeIds = new Set((storesResult.data || []).map((s: any) => s.id));
      storeIds.forEach(id => {
        const row = (progressResult.data as any[]).find((r: any) => r.store_id === id);
        const completed = row ? Number(row.completed_count) : 0;
        completions.push({ id, pct: totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0 });
      });
    }

    completions.sort((a, b) => b.pct - a.pct);
    const rank = completions.findIndex(s => s.id === storeId) + 1;
    const currentStore = completions.find(s => s.id === storeId);

    return NextResponse.json({
      rank: rank || totalStores,
      total_stores: totalStores,
      completion_percentage: currentStore?.pct || 0,
      is_top_3: rank > 0 && rank <= 3,
      is_first: rank === 1
    }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
