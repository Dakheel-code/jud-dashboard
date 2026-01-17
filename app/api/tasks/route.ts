import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { TaskWithProgress, TasksByCategory } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const store_id = searchParams.get('store_id');

    if (!store_id) {
      return NextResponse.json(
        { error: 'store_id is required' },
        { status: 400 }
      );
    }

    const { data: allTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .order('order_index', { ascending: true });

    if (tasksError) {
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

    return NextResponse.json({
      tasks: tasksByCategory,
      stats: {
        total: totalTasks,
        completed: completedTasks,
        percentage: completionPercentage,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
