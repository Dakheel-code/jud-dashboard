/**
 * Auth Guard - حماية API routes
 * يتحقق من صلاحية الجلسة قبل تنفيذ العمليات
 */

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  username?: string;
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthUser;
  error?: NextResponse;
}

/**
 * التحقق من الجلسة وإرجاع بيانات المستخدم
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
    
    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        username: user.username,
      },
    };
  } catch (error) {
    console.error('Auth check error:', error);
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
 * التحقق من الجلسة مع صلاحية معينة
 * @param allowedRoles الأدوار المسموح بها
 */
export async function requireRole(allowedRoles: string[]): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.authenticated) {
    return authResult;
  }

  if (!allowedRoles.includes(authResult.user!.role)) {
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
 * التحقق من صلاحية المسؤول (super_admin, admin, team_leader)
 */
export async function requireAdmin(): Promise<AuthResult> {
  return requireRole(['super_admin', 'admin', 'team_leader']);
}
