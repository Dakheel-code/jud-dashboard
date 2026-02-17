/**
 * API: إحصائيات الاجتماعات
 * GET /api/admin/meetings/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getMeetingStats } from '@/lib/meetings/meetings-service';

// جلب معرف المستخدم الحالي
async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('admin_user');
    if (userCookie?.value) {
      const user = JSON.parse(userCookie.value);
      return user.id || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // التحقق من المصادقة
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'غير مصرح', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    // جلب الإحصائيات
    const stats = await getMeetingStats(userId);
    
    return NextResponse.json({
      success: true,
      stats,
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
