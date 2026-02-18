import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUserPermissions } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // التحقق من NextAuth session — مصدر الحقيقة الوحيد
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { authenticated: false, error: 'غير مصرح' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    // جلب صلاحيات RBAC
    let rbacRoles: string[] = [];
    let rbacPermissions: string[] = [];
    try {
      const rbac = await getUserPermissions(user.id);
      rbacRoles = rbac.roles;
      rbacPermissions = rbac.permissions;
    } catch {
      // fallback
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: rbacRoles[0] || user.role,
        roles: rbacRoles,
        permissions: rbacPermissions,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { authenticated: false, error: 'حدث خطأ' },
      { status: 500 }
    );
  }
}
