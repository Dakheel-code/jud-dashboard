import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // جلب كل البيانات بالتوازي (بدون O(n²))
    const [storesResult, tasksResult, managersResult, storeCompletedResult, taskCompletedResult] = await Promise.all([
      supabase.from('stores').select('id, account_manager_id'),
      supabase.from('tasks').select('id, category'),
      supabase.from('admin_users').select('id, name').eq('is_active', true),
      // aggregation: عدد المهام المكتملة لكل متجر
      supabase.rpc('get_store_completed_counts'),
      // aggregation: عدد الإنجازات لكل مهمة
      supabase.rpc('get_task_completed_counts')
    ]);

    if (storesResult.error || tasksResult.error) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    const stores = storesResult.data;
    const allTasks = tasksResult.data;
    const accountManagers = managersResult.data || [];
    const totalStores = stores.length;
    const totalTasks = allTasks.length;

    // بناء maps للوصول السريع O(1)
    const storeCompletedMap: Record<string, number> = {};
    if (storeCompletedResult.data) {
      (storeCompletedResult.data as any[]).forEach((r: any) => {
        storeCompletedMap[r.store_id] = Number(r.completed_count);
      });
    }

    const taskCompletedMap: Record<string, number> = {};
    if (taskCompletedResult.data) {
      (taskCompletedResult.data as any[]).forEach((r: any) => {
        taskCompletedMap[r.task_id] = Number(r.completed_count);
      });
    }

    // حساب متوسط الإنجاز — O(n) بدلاً من O(n²)
    let totalCompletion = 0;
    stores.forEach((store: any) => {
      const completed = storeCompletedMap[store.id] || 0;
      totalCompletion += totalTasks > 0 ? (completed / totalTasks) * 100 : 0;
    });
    const averageCompletion = totalStores > 0 ? Math.round(totalCompletion / totalStores) : 0;

    // إحصائيات التصنيفات — O(tasks) بدلاً من O(tasks × progress)
    const categoryStats: Record<string, { completed: number; total: number }> = {};
    allTasks.forEach((task: any) => {
      if (!categoryStats[task.category]) {
        categoryStats[task.category] = { completed: 0, total: 0 };
      }
      categoryStats[task.category].total++;
      categoryStats[task.category].completed += taskCompletedMap[task.id] || 0;
    });

    let mostCompletedCategory = '';
    let leastCompletedCategory = '';
    let maxPercentage = -1;
    let minPercentage = 101;

    Object.entries(categoryStats).forEach(([category, stats]) => {
      const percentage = stats.total > 0 ? (stats.completed / (stats.total * totalStores)) * 100 : 0;
      if (percentage > maxPercentage) { maxPercentage = percentage; mostCompletedCategory = category; }
      if (percentage < minPercentage) { minPercentage = percentage; leastCompletedCategory = category; }
    });

    // إنجازات مديري الحسابات — O(stores) بدلاً من O(stores × progress)
    const managerMap: Record<string, string> = {};
    accountManagers.forEach((m: any) => { managerMap[m.id] = m.name; });

    const mgrStats: Record<string, { name: string; totalCompletion: number; storeCount: number }> = {};
    stores.forEach((store: any) => {
      if (store.account_manager_id && managerMap[store.account_manager_id]) {
        if (!mgrStats[store.account_manager_id]) {
          mgrStats[store.account_manager_id] = {
            name: managerMap[store.account_manager_id].split(' ')[0],
            totalCompletion: 0, storeCount: 0
          };
        }
        const completed = storeCompletedMap[store.id] || 0;
        mgrStats[store.account_manager_id].totalCompletion += totalTasks > 0 ? (completed / totalTasks) * 100 : 0;
        mgrStats[store.account_manager_id].storeCount++;
      }
    });

    let topAccountManager = { id: '', name: '-' };
    let lowestAccountManager = { id: '', name: '-' };
    let maxAvg = -1;
    let minAvg = 101;

    Object.entries(mgrStats).forEach(([id, stat]) => {
      if (stat.storeCount > 0) {
        const avg = stat.totalCompletion / stat.storeCount;
        if (avg > maxAvg) { maxAvg = avg; topAccountManager = { id, name: stat.name }; }
        if (avg < minAvg) { minAvg = avg; lowestAccountManager = { id, name: stat.name }; }
      }
    });

    return NextResponse.json({
      total_stores: totalStores,
      average_completion: averageCompletion,
      most_completed_category: mostCompletedCategory || 'N/A',
      least_completed_category: leastCompletedCategory || 'N/A',
      top_account_manager: topAccountManager,
      lowest_account_manager: lowestAccountManager,
    }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
