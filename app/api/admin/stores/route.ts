import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { StoreWithProgress } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    console.log('=== FETCH STORES ===');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials missing');
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    console.log('🔗 Connecting to Supabase:', supabaseUrl);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('📦 Stores fetched:', stores?.length, 'Data:', JSON.stringify(stores), 'Error:', storesError);

    if (storesError) {
      console.error('❌ Stores error:', storesError);
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
