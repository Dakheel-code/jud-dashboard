import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) return auth.error!;

    const supabase = getAdminClient();
    const userId = params.id;

    // جلب سجل التدقيق من task_activity_log
    const { data: taskLogs } = await supabase
      .from('task_activity_log')
      .select(`
        id, action, details, created_at,
        task:store_tasks(id, title)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    // جلب سجل إعادة التعيين
    const { data: reassignLogs } = await supabase
      .from('task_reassignments')
      .select(`
        id, created_at,
        task:store_tasks(id, title),
        from_user:admin_users!task_reassignments_from_user_id_fkey(id, name),
        to_user:admin_users!task_reassignments_to_user_id_fkey(id, name),
        by_user:admin_users!task_reassignments_reassigned_by_fkey(id, name)
      `)
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(20);

    // دمج وترتيب
    const combined = [
      ...(taskLogs || []).map(l => ({
        id: l.id,
        type: 'task_action' as const,
        action: l.action,
        details: l.details,
        task_title: (l.task as any)?.title || '—',
        created_at: l.created_at,
      })),
      ...(reassignLogs || []).map(l => ({
        id: l.id,
        type: 'reassign' as const,
        action: 'reassigned',
        details: {
          from: (l.from_user as any)?.name,
          to: (l.to_user as any)?.name,
          by: (l.by_user as any)?.name,
        },
        task_title: (l.task as any)?.title || '—',
        created_at: l.created_at,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
     .slice(0, 50);

    return NextResponse.json({ logs: combined });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
