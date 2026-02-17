/**
 * API: إعادة جدولة اجتماع
 * POST /api/meetings/[id]/reschedule
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMeetingByToken, rescheduleMeeting } from '@/lib/meetings/meetings-service';
import { updateCalendarEvent } from '@/lib/meetings/google-calendar-service';
import { getClientIP } from '@/lib/meetings/rate-limiter';
import { validateRequest, rescheduleMeetingSchema } from '@/lib/meetings/validation';

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
    const validation = validateRequest(rescheduleMeetingSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'البيانات غير صالحة', code: 'VALIDATION_ERROR', details: validation.errors },
        { status: 400 }
      );
    }
    
    const { token, new_datetime, reason } = validation.data!;
    
    // التحقق من الـ token وجلب الاجتماع
    const tokenResult = await getMeetingByToken(token, 'reschedule');
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
    
    // إعادة جدولة الاجتماع
    const newDatetime = new Date(new_datetime);
    const result = await rescheduleMeeting(
      meetingId,
      newDatetime,
      reason,
      'client',
      undefined,
      ip,
      userAgent
    );
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 }
      );
    }
    
    // تحديث الحدث في Google Calendar
    if (meeting.google_event_id && result.meeting) {
      try {
        const endTime = new Date(newDatetime.getTime() + meeting.duration_minutes * 60000);
        await updateCalendarEvent(meeting.employee_id, meeting.google_event_id, {
          startTime: newDatetime,
          endTime: endTime,
        });
      } catch (calendarError) {
      }
    }
    
    return NextResponse.json({
      success: true,
      meeting: result.meeting ? {
        id: result.meeting.id,
        old_datetime: meeting.start_at,
        new_datetime: result.meeting.start_at,
        reschedule_count: result.meeting.reschedule_count,
      } : null,
      message: 'تم إعادة جدولة الاجتماع بنجاح.',
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
