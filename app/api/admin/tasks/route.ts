import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, requireAdmin } from '@/lib/auth-guard';

// GET - Get all tasks
export async function GET() {
  try {
    // التحقق من الجلسة
    const auth = await requireAuth();
    if (!auth.authenticated) return auth.error!;

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .order('category', { ascending: true })
      .order('order_index', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST - Create new task
export async function POST(request: NextRequest) {
  try {
    // التحقق من الجلسة - فقط المسؤولين يمكنهم إنشاء مهام
    const auth = await requireAdmin();
    if (!auth.authenticated) return auth.error!;

    const body = await request.json();
    const { title, category, order_index } = body;

    if (!title || !category || order_index === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ title, category, order_index }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ task: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
