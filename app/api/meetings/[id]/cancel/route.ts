/**
 * API: إلغاء اجتماع
 * POST /api/meetings/[id]/cancel
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMeetingByToken, cancelMeeting, getMeetingById } from '@/lib/meetings/meetings-service';
import { deleteCalendarEvent } from '@/lib/meetings/google-calendar-service';
import { getClientIP } from '@/lib/meetings/rate-limiter';
import { validateRequest, cancelMeetingSchema } from '@/lib/meetings/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const meetingId = params.id;
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    
    // Parse body
    const body = await request.json();
    
    // Validation
    const validation = validateRequest(cancelMeetingSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'البيانات غير صالحة', code: 'VALIDATION_ERROR', details: validation.errors },
        { status: 400 }
      );
    }
    
    const { token, reason } = validation.data!;
    
    // التحقق من الـ token وجلب الاجتماع
    const tokenResult = await getMeetingByToken(token, 'cancel');
    if (tokenResult.error) {
      return NextResponse.json(
        { error: tokenResult.error, code: tokenResult.code },
        { status: tokenResult.code === 'MEETING_NOT_FOUND' ? 404 : 401 }
      );
    }
    
    const meeting = tokenResult.meeting!;
    
    // التحقق من أن الـ ID يطابق
    if (meeting.id !== meetingId) {
      return NextResponse.json(
        { error: 'رابط غير صالح', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }
    
    // إلغاء الاجتماع
    const result = await cancelMeeting(meetingId, reason, 'client', undefined, ip, userAgent);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 }
      );
    }
    
    // حذف الحدث من Google Calendar
    if (meeting.google_event_id) {
      try {
        await deleteCalendarEvent(meeting.employee_id, meeting.google_event_id);
      } catch (calendarError) {
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'تم إلغاء الاجتماع بنجاح.',
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
