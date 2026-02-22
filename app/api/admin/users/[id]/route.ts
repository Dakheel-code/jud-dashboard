import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth-guard';
import { getUserPermissions } from '@/lib/rbac';
import bcrypt from 'bcryptjs';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
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
      .select('id, username, name, email, phone, role, roles, avatar, monthly_salary, bank_name, bank_iban, bank_account_name, bank_account_number, is_active, created_at, last_login, last_seen_at')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // إخفاء الراتب والبيانات البنكية إذا لم يكن المستخدم الحالي owner
    const callerRoles: string[] = (auth.user as any)?.roles || ((auth.user as any)?.role ? [(auth.user as any).role] : []);
    const callerIsOwner = callerRoles.includes('owner');
    if (!callerIsOwner) {
      delete (user as any).monthly_salary;
      delete (user as any).bank_name;
      delete (user as any).bank_iban;
      delete (user as any).bank_account_name;
      delete (user as any).bank_account_number;
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

    // 1) تحديث بيانات user الأساسية فقط (بدون roles/permissions)
    const updateData: any = { updated_at: new Date().toISOString() };
    if (body.name      !== undefined) updateData.name      = body.name;
    if (body.email     !== undefined) updateData.email     = body.email;
    if (body.username  !== undefined) updateData.username  = body.username;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.avatar               !== undefined) updateData.avatar               = body.avatar;
    if (body.monthly_salary        !== undefined) updateData.monthly_salary       = body.monthly_salary;
    if (body.bank_name             !== undefined) updateData.bank_name            = body.bank_name;
    if (body.bank_iban             !== undefined) updateData.bank_iban            = body.bank_iban;
    if (body.bank_account_name     !== undefined) updateData.bank_account_name    = body.bank_account_name;
    if (body.bank_account_number   !== undefined) updateData.bank_account_number  = body.bank_account_number;
    if (body.password)                            updateData.password_hash        = hashPassword(body.password);

    const { data, error } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, name, email, avatar, is_active, created_at, last_login')
      .single();

    if (error) {
      return NextResponse.json({ ok: false, message: error.message, code: error.code }, { status: 400 });
    }

    // 2) تحديث RBAC roles إذا أُرسلت
    const desiredRoles: string[] = body.roles || (body.role ? [body.role] : []);

    if (desiredRoles.length > 0) {
      await supabase.from('admin_user_roles').delete().eq('user_id', id);

      const { data: roleRows, error: rolesErr } = await supabase
        .from('admin_roles')
        .select('id, key')
        .in('key', desiredRoles);

      if (rolesErr) {
        return NextResponse.json({ ok: false, message: rolesErr.message }, { status: 500 });
      }

      const links = (roleRows || []).map((r: any) => ({ user_id: id, role_id: r.id }));
      if (links.length > 0) {
        const { error: linkErr } = await supabase.from('admin_user_roles').insert(links);
        if (linkErr) {
          return NextResponse.json({ ok: false, message: linkErr.message }, { status: 500 });
        }
      }
    }

    // 3) إرجاع RBAC الحقيقي
    const rbac = await getUserPermissions(id);

    return NextResponse.json({
      ok: true,
      user: {
        ...data,
        role:        rbac.roles[0] || 'employee',
        roles:       rbac.roles,
        permissions: rbac.permissions,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
