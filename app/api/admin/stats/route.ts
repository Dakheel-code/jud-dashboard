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

    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, account_manager_id');

    if (storesError) {
      return NextResponse.json(
        { error: 'Failed to fetch stores' },
        { status: 500 }
      );
    }

    // جلب مديري الحسابات
    const { data: accountManagers } = await supabase
      .from('admin_users')
      .select('id, name')
      .eq('is_active', true);

    const { data: allTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, category');

    if (tasksError) {
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    const { data: allProgress, error: progressError } = await supabase
      .from('tasks_progress')
      .select('store_id, task_id, is_done');

    if (progressError) {
      return NextResponse.json(
        { error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }

    const totalStores = stores.length;
    const totalTasks = allTasks.length;

    let totalCompletion = 0;
    stores.forEach((store: any) => {
      const storeProgress = allProgress.filter(
        (p: any) => p.store_id === store.id && p.is_done
      );
      const completion =
        totalTasks > 0 ? (storeProgress.length / totalTasks) * 100 : 0;
      totalCompletion += completion;
    });

    const averageCompletion =
      totalStores > 0 ? Math.round(totalCompletion / totalStores) : 0;

    const categoryStats: { [key: string]: { completed: number; total: number } } = {};
    allTasks.forEach((task: { category: string; id: number }) => {
      if (!categoryStats[task.category]) {
        categoryStats[task.category] = { completed: 0, total: 0 };
      }
      categoryStats[task.category].total++;

      const taskProgress = allProgress.filter(
        (p: any) => p.task_id === task.id && p.is_done
      );
      categoryStats[task.category].completed += taskProgress.length;
    });

    let mostCompletedCategory = '';
    let leastCompletedCategory = '';
    let maxPercentage = -1;
    let minPercentage = 101;

    Object.entries(categoryStats).forEach(([category, stats]) => {
      const percentage =
        stats.total > 0 ? (stats.completed / (stats.total * totalStores)) * 100 : 0;

      if (percentage > maxPercentage) {
        maxPercentage = percentage;
        mostCompletedCategory = category;
      }
      if (percentage < minPercentage) {
        minPercentage = percentage;
        leastCompletedCategory = category;
      }
    });

    // حساب إنجازات مديري الحسابات
    const managerStats: { [key: string]: { name: string; totalCompletion: number; storeCount: number } } = {};
    
    stores.forEach((store: any) => {
      if (store.account_manager_id) {
        const manager = accountManagers?.find((m: any) => m.id === store.account_manager_id);
        if (manager) {
          if (!managerStats[store.account_manager_id]) {
            managerStats[store.account_manager_id] = { 
              name: manager.name.split(' ')[0], 
              totalCompletion: 0, 
              storeCount: 0 
            };
          }
          
          const storeProgress = allProgress.filter(
            (p: any) => p.store_id === store.id && p.is_done
          );
          const completion = totalTasks > 0 ? (storeProgress.length / totalTasks) * 100 : 0;
          
          managerStats[store.account_manager_id].totalCompletion += completion;
          managerStats[store.account_manager_id].storeCount++;
        }
      }
    });

    let topAccountManager = { id: '', name: '-' };
    let lowestAccountManager = { id: '', name: '-' };
    let maxAvg = -1;
    let minAvg = 101;

    Object.entries(managerStats).forEach(([managerId, stat]) => {
      if (stat.storeCount > 0) {
        const avg = stat.totalCompletion / stat.storeCount;
        if (avg > maxAvg) {
          maxAvg = avg;
          topAccountManager = { id: managerId, name: stat.name };
        }
        if (avg < minAvg) {
          minAvg = avg;
          lowestAccountManager = { id: managerId, name: stat.name };
        }
      }
    });

    return NextResponse.json({
      total_stores: totalStores,
      average_completion: averageCompletion,
      most_completed_category: mostCompletedCategory || 'N/A',
      least_completed_category: leastCompletedCategory || 'N/A',
      top_account_manager: topAccountManager,
      lowest_account_manager: lowestAccountManager,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
