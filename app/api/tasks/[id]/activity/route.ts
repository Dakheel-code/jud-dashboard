import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database configuration error');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// GET /api/tasks/[id]/activity - جلب سجل نشاط المهمة
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    const supabase = getSupabaseClient();

    const { data: activities, error } = await supabase
      .from('task_activity_log')
      .select(`
        *,
        user:admin_users(id, name, username, avatar)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching activity log:', error);
      return NextResponse.json({ error: 'فشل جلب سجل النشاط' }, { status: 500 });
    }

    return NextResponse.json({ activities: activities || [] });
  } catch (error) {
    console.error('GET activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
