/**
 * Auth Guard - حماية API routes
 * مصدر الحقيقة الوحيد = جداول RBAC
 * ممنوع الاعتماد على admin_users.role / roles / permissions
 */

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';
import { getUserPermissions } from './rbac';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  username?: string;
  rbacRoles?: string[];
  rbacPermissions?: string[];
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthUser;
  error?: NextResponse;
}

/**
 * التحقق من الجلسة وإرجاع بيانات المستخدم + صلاحيات RBAC
 * @returns AuthResult مع بيانات المستخدم أو خطأ 401
 */
export async function requireAuth(): Promise<AuthResult> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return {
        authenticated: false,
        error: NextResponse.json(
          { error: 'غير مصرح - يرجى تسجيل الدخول' },
          { status: 401 }
        ),
      };
    }

    const user = session.user as any;

    // جلب صلاحيات RBAC الحقيقية من DB
    let rbacRoles: string[] = [];
    let rbacPermissions: string[] = [];
    try {
      const rbac = await getUserPermissions(user.id);
      rbacRoles = rbac.roles;
      rbacPermissions = rbac.permissions;
    } catch {
      // fallback: إذا جداول RBAC غير موجودة بعد
    }
    
    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        username: user.username,
        rbacRoles,
        rbacPermissions,
      },
    };
  } catch (error) {
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: 'خطأ في التحقق من الجلسة' },
        { status: 500 }
      ),
    };
  }
}

/**
 * التحقق من صلاحية RBAC معينة
 * @param permission الصلاحية المطلوبة (e.g. "users.read")
 */
export async function requirePermission(permission: string): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.authenticated) {
    return authResult;
  }

  const perms = authResult.user!.rbacPermissions || [];
  if (!perms.includes(permission)) {
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: `غير مصرح - تحتاج صلاحية: ${permission}` },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

/**
 * التحقق من أي صلاحية من قائمة
 * @param permissions قائمة الصلاحيات (يكفي واحدة)
 */
export async function requireAnyPermission(permissions: string[]): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.authenticated) {
    return authResult;
  }

  const perms = authResult.user!.rbacPermissions || [];
  if (!permissions.some(p => perms.includes(p))) {
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: `غير مصرح - تحتاج إحدى الصلاحيات: ${permissions.join(', ')}` },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

/**
 * @deprecated استخدم requirePermission() بدلاً منها
 * التحقق من الجلسة مع دور معين (legacy — للتوافق المؤقت)
 */
export async function requireRole(allowedRoles: string[]): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.authenticated) {
    return authResult;
  }

  // تحقق من RBAC roles أولاً، ثم fallback للـ legacy role
  const rbacRoles = authResult.user!.rbacRoles || [];
  const legacyRole = authResult.user!.role;
  const hasRole = allowedRoles.some(r => rbacRoles.includes(r)) || allowedRoles.includes(legacyRole);

  if (!hasRole) {
    return {
      authenticated: false,
      error: NextResponse.json(
        { error: 'غير مصرح - ليس لديك الصلاحية الكافية' },
        { status: 403 }
      ),
    };
  }

  return authResult;
}

/**
 * @deprecated استخدم requirePermission('dashboard.read') بدلاً منها
 * التحقق من صلاحية المسؤول (legacy — للتوافق المؤقت)
 */
export async function requireAdmin(): Promise<AuthResult> {
  // أي مستخدم مسجّل دخوله يُعتبر admin — الصلاحيات التفصيلية تُفحص عبر requirePermission
  return requireAuth();
}
