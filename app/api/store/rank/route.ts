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

    // جلب جميع المتاجر
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, store_url');

    if (storesError) {
      return NextResponse.json({ error: 'Failed to fetch stores' }, { status: 500 });
    }

    // جلب جميع المهام
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id');

    if (tasksError) {
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    const totalTasks = tasks.length;

    // جلب تقدم جميع المتاجر
    const { data: allProgress, error: progressError } = await supabase
      .from('tasks_progress')
      .select('store_id, is_done');

    if (progressError) {
      return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 });
    }

    // حساب نسبة الإنجاز لكل متجر
    const storeCompletions = stores.map(store => {
      const storeProgress = allProgress.filter(p => p.store_id === store.id && p.is_done);
      const completionPercentage = totalTasks > 0 ? Math.round((storeProgress.length / totalTasks) * 100) : 0;
      return {
        id: store.id,
        store_url: store.store_url,
        completion_percentage: completionPercentage
      };
    });

    // ترتيب المتاجر حسب نسبة الإنجاز (تنازلي)
    storeCompletions.sort((a, b) => b.completion_percentage - a.completion_percentage);

    // إيجاد ترتيب المتجر المطلوب
    const rank = storeCompletions.findIndex(s => s.id === storeId) + 1;
    const totalStores = stores.length;
    const currentStore = storeCompletions.find(s => s.id === storeId);

    return NextResponse.json({
      rank,
      total_stores: totalStores,
      completion_percentage: currentStore?.completion_percentage || 0,
      is_top_3: rank <= 3,
      is_first: rank === 1
    });
  } catch (error) {
    console.error('Error fetching rank:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
