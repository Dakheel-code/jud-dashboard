import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { TaskWithProgress, TasksByCategory } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let store_id = searchParams.get('store_id');
    const store_url = searchParams.get('store_url');

    // إذا تم تمرير store_url، نجلب بيانات المتجر الكاملة من قاعدة البيانات
    let storeFullData: any = null;
    if (!store_id && store_url) {
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('*, account_manager:admin_users!stores_account_manager_id_fkey(id, name)')
        .eq('store_url', store_url)
        .single();

      if (storeError || !storeData) {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404 }
        );
      }
      store_id = storeData.id;
      storeFullData = storeData;
    }

    if (!store_id) {
      return NextResponse.json(
        { error: 'store_id or store_url is required' },
        { status: 400 }
      );
    }

    const { data: allTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .order('order_index', { ascending: true });

    console.log('Tasks from DB:', allTasks?.length, 'Error:', tasksError);

    if (tasksError) {
      console.error('Tasks error:', tasksError);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    const { data: progressData, error: progressError } = await supabase
      .from('tasks_progress')
      .select('task_id, is_done')
      .eq('store_id', store_id);

    if (progressError) {
      return NextResponse.json(
        { error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }

    const progressMap = new Map(
      progressData?.map((p: any) => [p.task_id, p.is_done]) || []
    );

    const tasksWithProgress: TaskWithProgress[] = allTasks.map((task: any) => ({
      ...task,
      is_done: progressMap.get(task.id) || false,
    }));

    const tasksByCategory: TasksByCategory = tasksWithProgress.reduce(
      (acc, task) => {
        if (!acc[task.category]) {
          acc[task.category] = [];
        }
        acc[task.category].push(task);
        return acc;
      },
      {} as TasksByCategory
    );

    const totalTasks = tasksWithProgress.length;
    const completedTasks = tasksWithProgress.filter((t) => t.is_done).length;
    const completionPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // جلب store_url إذا لم يكن متاحاً
    let responseStoreUrl = store_url;
    if (!responseStoreUrl && store_id) {
      const { data: storeInfo } = await supabase
        .from('stores')
        .select('store_url')
        .eq('id', store_id)
        .single();
      responseStoreUrl = storeInfo?.store_url;
    }

    return NextResponse.json({
      tasks: tasksByCategory,
      stats: {
        total: totalTasks,
        completed: completedTasks,
        percentage: completionPercentage,
      },
      store_id,
      store_url: responseStoreUrl,
      store: storeFullData,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
