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

// GET — جلب أعضاء الفريق + KPIs مختصرة لكل عضو
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) return auth.error!;

    const supabase = getAdminClient();
    const leaderId = params.id;

    // جلب الفريق الذي هذا المستخدم قائده
    const { data: team } = await supabase
      .from('teams')
      .select('id, name, description')
      .eq('leader_id', leaderId)
      .single();

    if (!team) {
      return NextResponse.json({ team: null, members: [] });
    }

    // جلب الأعضاء
    const { data: members } = await supabase
      .from('admin_users')
      .select('id, name, username, avatar, role, is_active, last_seen_at')
      .eq('team_id', team.id)
      .eq('is_active', true);

    if (!members || members.length === 0) {
      return NextResponse.json({ team, members: [] });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // KPIs مختصرة لكل عضو
    const membersWithKpi = await Promise.all(
      members.map(async (member) => {
        const [openR, overdueR, doneMonthR] = await Promise.all([
          supabase.from('store_tasks').select('id', { count: 'exact', head: true })
            .eq('assigned_to', member.id).not('status', 'in', '("done","canceled")'),
          supabase.from('store_tasks').select('id', { count: 'exact', head: true })
            .eq('assigned_to', member.id).not('status', 'in', '("done","canceled")')
            .not('due_date', 'is', null).lt('due_date', now.toISOString()),
          supabase.from('store_tasks').select('id', { count: 'exact', head: true })
            .eq('assigned_to', member.id).eq('status', 'done').gte('updated_at', monthStart),
        ]);
        return {
          ...member,
          kpi: {
            open: openR.count ?? 0,
            overdue: overdueR.count ?? 0,
            done_month: doneMonthR.count ?? 0,
          },
        };
      })
    );

    return NextResponse.json({ team, members: membersWithKpi });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
