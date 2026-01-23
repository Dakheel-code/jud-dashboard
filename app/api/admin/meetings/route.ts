/**
 * API: إدارة اجتماعات الموظف
 * GET /api/admin/meetings - جلب الاجتماعات
 * POST /api/admin/meetings - إنشاء اجتماع (من لوحة التحكم)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getEmployeeMeetings, createMeeting, updateMeetingStatus, cancelMeeting } from '@/lib/meetings/meetings-service';
import { getClientIP } from '@/lib/meetings/rate-limiter';
import type { MeetingStatus } from '@/lib/meetings/types';

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
    
    // جلب المعاملات
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as MeetingStatus | null;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // جلب الاجتماعات
    const result = await getEmployeeMeetings(userId, {
      status: status || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
    });
    
    return NextResponse.json({
      success: true,
      meetings: result.meetings,
      pagination: {
        page,
        limit,
        total: result.total,
        total_pages: Math.ceil(result.total / limit),
      },
    });
    
  } catch (error) {
    console.error('Error in GET /api/admin/meetings:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
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
    
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    const body = await request.json();
    
    // إنشاء الاجتماع
    const result = await createMeeting({
      ...body,
      employee_id: userId,
    }, ip, userAgent);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      meeting: result.meeting,
      message: 'تم إنشاء الاجتماع بنجاح.',
    });
    
  } catch (error) {
    console.error('Error in POST /api/admin/meetings:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // التحقق من المصادقة
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'غير مصرح', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { meeting_id, status } = body;
    
    if (!meeting_id || !status) {
      return NextResponse.json(
        { error: 'البيانات غير مكتملة', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    // تحديث الحالة
    const result = await updateMeetingStatus(meeting_id, status, userId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: 'UPDATE_FAILED' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'تم تحديث حالة الاجتماع.',
    });
    
  } catch (error) {
    console.error('Error in PUT /api/admin/meetings:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // التحقق من المصادقة
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: 'غير مصرح', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    const body = await request.json();
    const { meeting_id, reason } = body;
    
    if (!meeting_id) {
      return NextResponse.json(
        { error: 'معرف الاجتماع مطلوب', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    // إلغاء الاجتماع
    const result = await cancelMeeting(meeting_id, reason, 'employee', userId, ip, userAgent);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'تم إلغاء الاجتماع بنجاح.',
    });
    
  } catch (error) {
    console.error('Error in DELETE /api/admin/meetings:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
