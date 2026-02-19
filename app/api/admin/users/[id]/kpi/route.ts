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

    // RLS: المستخدم يشوف نفسه أو Admin/team_leader
    const currentId = auth.user!.id;
    if (currentId !== params.id) {
      const { getUserPermissions } = await import('@/lib/rbac');
      const rbac = await getUserPermissions(currentId);
      const canView = rbac.roles.some((r: string) =>
        ['super_admin', 'admin', 'manager', 'team_leader'].includes(r)
      );
      if (!canView) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const supabase = getAdminClient();
    const userId = params.id;
    const now = new Date();
    const nowIso = now.toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

    // 1) مهام مفتوحة
    const { count: openCount } = await supabase
      .from('store_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .not('status', 'in', '("done","canceled")');

    // 2) مهام متأخرة
    const { count: overdueCount } = await supabase
      .from('store_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .not('status', 'in', '("done","canceled")')
      .not('due_date', 'is', null)
      .lt('due_date', nowIso);

    // 3) مكتملة هذا الشهر
    const { count: completedMonthCount } = await supabase
      .from('store_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .eq('status', 'done')
      .gte('updated_at', monthStart);

    // 4) due_soon: مهام موعدها خلال 3 أيام (غير متأخرة)
    const { count: dueSoonCount } = await supabase
      .from('store_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .not('status', 'in', '("done","canceled")')
      .not('due_date', 'is', null)
      .gte('due_date', nowIso)
      .lte('due_date', threeDaysLater);

    // 5) الالتزام: مهام مكتملة قبل/في موعدها ÷ كل المهام المكتملة
    const { data: closedTasks } = await supabase
      .from('store_tasks')
      .select('created_at, updated_at, due_date')
      .eq('assigned_to', userId)
      .eq('status', 'done')
      .not('created_at', 'is', null)
      .not('updated_at', 'is', null)
      .limit(500);

    let avgClosingDays = 0;
    let commitmentRate = 0;

    if (closedTasks && closedTasks.length > 0) {
      // متوسط وقت الإغلاق
      const totalMs = closedTasks.reduce((sum, t) => {
        const diff = new Date(t.updated_at).getTime() - new Date(t.created_at).getTime();
        return sum + (diff > 0 ? diff : 0);
      }, 0);
      avgClosingDays = Math.round(totalMs / closedTasks.length / (1000 * 60 * 60 * 24));

      // الالتزام — فقط المهام التي لها due_date
      const withDueDate = closedTasks.filter(t => t.due_date);
      if (withDueDate.length > 0) {
        const onTime = withDueDate.filter(t =>
          new Date(t.updated_at) <= new Date(t.due_date)
        ).length;
        commitmentRate = Math.round((onTime / withDueDate.length) * 100);
      } else {
        commitmentRate = 100; // لا يوجد due_date = لا تأخير
      }
    }

    // 6) Workload score (0-100): يعتمد على open + overdue*2 + dueSoon
    const MONTHLY_GOAL = 20; // هدف شهري ثابت (قابل للتخصيص لاحقاً)
    const workloadRaw = (openCount ?? 0) + (overdueCount ?? 0) * 2 + (dueSoonCount ?? 0);
    const workloadScore = Math.min(100, Math.round((workloadRaw / Math.max(MONTHLY_GOAL, 1)) * 100));

    const response = NextResponse.json({
      open: openCount ?? 0,
      overdue: overdueCount ?? 0,
      due_soon: dueSoonCount ?? 0,
      completed_this_month: completedMonthCount ?? 0,
      avg_closing_days: avgClosingDays,
      commitment_rate: commitmentRate,
      workload_score: workloadScore,
      monthly_goal: MONTHLY_GOAL,
    });
    response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
