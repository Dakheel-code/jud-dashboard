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

    // جلب الأنشطة بدون join
    const { data: activities, error } = await supabase
      .from('task_activity_log')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: 'فشل جلب سجل النشاط' }, { status: 500 });
    }

    if (activities && activities.length > 0) {
    }

    // جلب بيانات المستخدمين بشكل منفصل ودمج meta و details
    const activitiesWithUsers = await Promise.all((activities || []).map(async (activity) => {
      let user = null;
      if (activity.user_id) {
        const { data } = await supabase
          .from('admin_users')
          .select('id, name, username, avatar')
          .eq('id', activity.user_id)
          .single();
        user = data;
      }
      // دمج meta و details (الأولوية لـ details)
      const details = { ...(activity.meta || {}), ...(activity.details || {}) };
      return { ...activity, user, details };
    }));

    return NextResponse.json({ activities: activitiesWithUsers });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
