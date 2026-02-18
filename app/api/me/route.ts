import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getUserPermissions } from "@/lib/rbac";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const user = session.user as any;

    // جلب صلاحيات RBAC الحقيقية
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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: rbacRoles[0] || user.role,
        roles: rbacRoles,
        username: user.username,
        avatar: user.avatar || user.image,
        permissions: rbacPermissions,
        provider: user.provider,
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
