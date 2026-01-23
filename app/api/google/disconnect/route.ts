/**
 * API: إلغاء ربط Google Calendar
 * POST /api/google/disconnect
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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

export async function POST(request: NextRequest) {
  try {
    // التحقق من المصادقة
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'غير مصرح', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // حذف حساب Google OAuth للموظف
    const { error } = await supabase
      .from('google_oauth_accounts')
      .delete()
      .eq('employee_id', userId);

    if (error) {
      console.error('Error disconnecting Google:', error);
      return NextResponse.json(
        { error: 'فشل إلغاء الربط', code: 'DELETE_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم إلغاء ربط Google Calendar بنجاح',
    });

  } catch (error) {
    console.error('Error in /api/google/disconnect:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
