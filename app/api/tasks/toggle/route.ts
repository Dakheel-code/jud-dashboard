import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { store_id, task_id } = await request.json();

    if (!store_id || !task_id) {
      return NextResponse.json(
        { error: 'store_id and task_id are required' },
        { status: 400 }
      );
    }

    const { data: existingProgress, error: fetchError } = await supabase
      .from('tasks_progress')
      .select('*')
      .eq('store_id', store_id)
      .eq('task_id', task_id)
      .single();

    if (existingProgress) {
      const { error: updateError } = await supabase
        .from('tasks_progress')
        .update({
          is_done: !existingProgress.is_done,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProgress.id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update progress' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        is_done: !existingProgress.is_done,
      });
    }

    const { error: insertError } = await supabase
      .from('tasks_progress')
      .insert([
        {
          store_id,
          task_id,
          is_done: true,
        },
      ]);

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, is_done: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
