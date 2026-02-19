/**
 * Meta API Guard
 * حماية routes الربط/الفصل/المزامنة
 * القاعدة: Admin + AccountManager + TeamLeader فقط يربطون/يفصلون
 * الموظف العادي: قراءة cache فقط (لا يصل لهذه الـ routes)
 */

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

const MANAGE_ROLES = ['super_admin', 'admin', 'team_leader', 'account_manager'];

export interface MetaGuardResult {
  ok: boolean;
  userId?: string;
  role?: string;
  error?: NextResponse;
}

/**
 * يتحقق أن المستخدم مسجّل دخوله ولديه دور مسموح بإدارة Meta
 */
export async function requireMetaManage(): Promise<MetaGuardResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: 'غير مصرح — يرجى تسجيل الدخول' },
        { status: 401 }
      ),
    };
  }

  const user = session.user as any;
  const role: string = user.role || '';

  if (!MANAGE_ROLES.includes(role)) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: 'غير مصرح — هذه العملية تتطلب صلاحية Admin أو Account Manager' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId: user.id, role };
}

/**
 * يتحقق أن المستخدم مسجّل دخوله فقط (للقراءة)
 */
export async function requireMetaRead(): Promise<MetaGuardResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      ok: false,
      error: NextResponse.json(
        { error: 'غير مصرح — يرجى تسجيل الدخول' },
        { status: 401 }
      ),
    };
  }

  const user = session.user as any;
  return { ok: true, userId: user.id, role: user.role || '' };
}
