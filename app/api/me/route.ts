import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const user = session.user as any;
    
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: user.roles || [],
        username: user.username,
        avatar: user.avatar || user.image,
        permissions: user.permissions || [],
        provider: user.provider,
      }
    });
  } catch (error) {
    console.error("Error in /api/me:", error);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
