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

    // RLS: المستخدم يشوف نفسه فقط — أو Admin/super_admin
    const currentId = auth.user!.id;
    const { data: currentUser } = await getAdminClient()
      .from('admin_users')
      .select('id')
      .eq('id', currentId)
      .single();
    // نتحقق من الأدوار عبر RBAC
    const { getUserPermissions } = await import('@/lib/rbac');
    const rbac = await getUserPermissions(currentId);
    const isAdmin = rbac.roles.some((r: string) => ['super_admin', 'admin', 'manager'].includes(r));
    const isTeamLeader = rbac.roles.includes('team_leader');
    if (currentId !== params.id && !isAdmin && !isTeamLeader) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const supabase = getAdminClient();
    const userId = params.id;
    const now = new Date();

    // حدود الـ 14 يوم
    const day14Ago = new Date(now);
    day14Ago.setDate(day14Ago.getDate() - 13);
    day14Ago.setHours(0, 0, 0, 0);

    // حدود الشهر الحالي والماضي
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 1);

    // جلب المهام المكتملة آخر 14 يوم
    const { data: done14 } = await supabase
      .from('store_tasks')
      .select('updated_at')
      .eq('assigned_to', userId)
      .eq('status', 'done')
      .gte('updated_at', day14Ago.toISOString())
      .lte('updated_at', now.toISOString());

    // بناء مصفوفة الـ 14 يوم
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(day14Ago);
      d.setDate(d.getDate() + i);
      dailyMap[d.toISOString().slice(0, 10)] = 0;
    }
    (done14 || []).forEach(t => {
      const day = t.updated_at.slice(0, 10);
      if (dailyMap[day] !== undefined) dailyMap[day]++;
    });

    const daily14 = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

    // مقارنة شهرية
    const [thisMonthR, lastMonthR] = await Promise.all([
      supabase
        .from('store_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', userId)
        .eq('status', 'done')
        .gte('updated_at', thisMonthStart.toISOString()),
      supabase
        .from('store_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', userId)
        .eq('status', 'done')
        .gte('updated_at', lastMonthStart.toISOString())
        .lt('updated_at', lastMonthEnd.toISOString()),
    ]);

    const thisMonth = thisMonthR.count ?? 0;
    const lastMonth = lastMonthR.count ?? 0;
    const growthPct = lastMonth > 0
      ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
      : thisMonth > 0 ? 100 : 0;

    const response = NextResponse.json({
      daily14,
      monthly: {
        this_month: thisMonth,
        last_month: lastMonth,
        growth_pct: growthPct,
      },
    });
    response.headers.set('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
