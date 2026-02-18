/**
 * RBAC — Role-Based Access Control
 * مصدر الحقيقة الوحيد للصلاحيات = جداول RBAC
 * ممنوع الاعتماد على admin_users.role / roles / permissions
 */

import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export interface UserPermissions {
  roles: string[];           // e.g. ["viewer", "editor"]
  permissions: string[];     // e.g. ["dashboard.read", "users.read"]
}

/**
 * جلب صلاحيات المستخدم من جداول RBAC
 * 1. يجمع كل الأدوار من admin_user_roles
 * 2. يجمع كل الصلاحيات من admin_role_permissions
 * 3. يطبق overrides من admin_user_permissions (grant/deny)
 * 4. deny ينتصر على grant
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const supabase = getSupabaseClient();

  // 1) جلب أدوار المستخدم
  const { data: userRoles } = await supabase
    .from('admin_user_roles')
    .select('role:admin_roles(key)')
    .eq('user_id', userId);

  const roles: string[] = (userRoles || [])
    .map((r: any) => r.role?.key)
    .filter(Boolean);

  // 2) جلب صلاحيات الأدوار
  const { data: rolePerms } = await supabase
    .from('admin_user_roles')
    .select(`
      role:admin_roles!inner(
        permissions:admin_role_permissions(
          permission:admin_permissions(key)
        )
      )
    `)
    .eq('user_id', userId);

  const rolePermSet = new Set<string>();
  (rolePerms || []).forEach((r: any) => {
    (r.role?.permissions || []).forEach((rp: any) => {
      if (rp.permission?.key) rolePermSet.add(rp.permission.key);
    });
  });

  // 3) جلب overrides المباشرة (grant / deny)
  const { data: overrides } = await supabase
    .from('admin_user_permissions')
    .select('mode, permission:admin_permissions(key)')
    .eq('user_id', userId);

  const grants = new Set<string>();
  const denies = new Set<string>();

  (overrides || []).forEach((o: any) => {
    const key = o.permission?.key;
    if (!key) return;
    if (o.mode === 'grant') grants.add(key);
    if (o.mode === 'deny') denies.add(key);
  });

  // 4) دمج: role permissions + grants - denies
  //    deny ينتصر دائماً
  const finalPerms = new Set<string>();

  rolePermSet.forEach((p) => {
    if (!denies.has(p)) finalPerms.add(p);
  });

  grants.forEach((p) => {
    if (!denies.has(p)) finalPerms.add(p);
  });

  return {
    roles,
    permissions: Array.from(finalPerms),
  };
}

/**
 * التحقق من صلاحية معينة
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const { permissions } = await getUserPermissions(userId);
  return permissions.includes(permission);
}

/**
 * التحقق من أي صلاحية من قائمة
 */
export async function hasAnyPermission(userId: string, requiredPerms: string[]): Promise<boolean> {
  const { permissions } = await getUserPermissions(userId);
  return requiredPerms.some((p) => permissions.includes(p));
}

/**
 * التحقق من كل الصلاحيات في قائمة
 */
export async function hasAllPermissions(userId: string, requiredPerms: string[]): Promise<boolean> {
  const { permissions } = await getUserPermissions(userId);
  return requiredPerms.every((p) => permissions.includes(p));
}
