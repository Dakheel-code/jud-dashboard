import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { StoreWithProgress } from '@/types';

export async function GET() {
  try {
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false });

    if (storesError) {
      return NextResponse.json(
        { error: 'Failed to fetch stores' },
        { status: 500 }
      );
    }

    const { data: allTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id');

    if (tasksError) {
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    const { data: allProgress, error: progressError } = await supabase
      .from('tasks_progress')
      .select('store_id, is_done');

    if (progressError) {
      return NextResponse.json(
        { error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }

    const totalTasks = allTasks.length;

    const storesWithProgress: StoreWithProgress[] = stores.map((store: any) => {
      const storeProgress = allProgress.filter(
        (p: any) => p.store_id === store.id && p.is_done
      );
      const completedTasks = storeProgress.length;
      const completionPercentage =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: store.id,
        store_url: store.store_url,
        created_at: store.created_at,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        completion_percentage: completionPercentage,
      };
    });

    return NextResponse.json({ stores: storesWithProgress });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
