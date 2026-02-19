import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth-guard';
import crypto from 'crypto';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // التحقق من الجلسة
    const auth = await requireAuth();
    if (!auth.authenticated) return auth.error!;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const userId = params.id;

    // جلب بيانات المستخدم
    const { data: user, error: userError } = await supabase
      .from('admin_users')
      .select('id, username, name, email, role, roles, is_active, created_at, last_login')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // جلب المتاجر المسندة لهذا المستخدم
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .eq('account_manager_id', userId)
      .order('created_at', { ascending: false });

    if (storesError) {
    }

    // جلب جميع المهام
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('id');

    const totalTasksCount = allTasks?.length || 0;

    // جلب تقدم المهام لكل متجر
    const { data: allProgress } = await supabase
      .from('tasks_progress')
      .select('store_id, is_done');

    // حساب الإحصائيات لكل متجر
    const storesWithProgress = (stores || []).map((store: any) => {
      const storeProgress = (allProgress || []).filter(
        (p: any) => p.store_id === store.id && p.is_done
      );
      const completedTasks = storeProgress.length;
      const completionPercentage = totalTasksCount > 0 
        ? Math.round((completedTasks / totalTasksCount) * 100) 
        : 0;

      return {
        id: store.id,
        store_name: store.store_name,
        store_url: store.store_url,
        owner_name: store.owner_name,
        owner_phone: store.owner_phone,
        created_at: store.created_at,
        status: store.status || 'new',
        priority: store.priority || 'medium',
        total_tasks: totalTasksCount,
        completed_tasks: completedTasks,
        completion_percentage: completionPercentage,
      };
    });

    // حساب الإحصائيات الإجمالية
    const totalStores = storesWithProgress.length;
    const completedStores = storesWithProgress.filter((s: any) => s.completion_percentage === 100).length;
    const inProgressStores = totalStores - completedStores;
    const totalTasksCompleted = storesWithProgress.reduce((sum: number, s: any) => sum + s.completed_tasks, 0);
    const totalTasks = totalStores * totalTasksCount;
    const averageCompletion = totalStores > 0 
      ? Math.round(storesWithProgress.reduce((sum: number, s: any) => sum + s.completion_percentage, 0) / totalStores)
      : 0;

    const stats = {
      total_stores: totalStores,
      completed_stores: completedStores,
      in_progress_stores: inProgressStores,
      average_completion: averageCompletion,
      total_tasks_completed: totalTasksCompleted,
      total_tasks: totalTasks,
    };

    return NextResponse.json({
      user,
      stores: storesWithProgress,
      stats,
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - تحديث بيانات مستخدم محدد
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) return auth.error!;

    const id = params.id;
    const body = await request.json();

    const supabase = getAdminClient();

    const updateData: any = { updated_at: new Date().toISOString() };

    if (body.name       !== undefined) updateData.name       = body.name;
    if (body.email      !== undefined) updateData.email      = body.email;
    if (body.username   !== undefined) updateData.username   = body.username;
    if (body.role       !== undefined) updateData.role       = body.role;
    if (body.roles      !== undefined) { updateData.roles = body.roles; updateData.role = body.roles[0]; }
    if (body.permissions !== undefined) updateData.permissions = body.permissions;
    if (body.is_active  !== undefined) updateData.is_active  = body.is_active;
    if (body.avatar     !== undefined) updateData.avatar     = body.avatar;
    if (body.password)                 updateData.password_hash = hashPassword(body.password);

    const { data, error } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, name, email, role, roles, permissions, avatar, is_active, created_at, last_login')
      .single();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message, code: error.code }, { status: 400 });
    }

    return NextResponse.json({ ok: true, user: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
