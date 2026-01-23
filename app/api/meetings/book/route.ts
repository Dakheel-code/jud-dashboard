/**
 * API: حجز اجتماع جديد
 * POST /api/meetings/book
 */

import { NextRequest, NextResponse } from 'next/server';
import { createMeeting, getEmployee } from '@/lib/meetings/meetings-service';
import { createCalendarEvent } from '@/lib/meetings/google-calendar-service';
import { checkRateLimit, getClientIP, verifyTurnstile } from '@/lib/meetings/rate-limiter';
import { validateRequest, bookMeetingSchema } from '@/lib/meetings/validation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    
    // Rate Limiting - 5 حجوزات في الساعة
    const rateLimit = await checkRateLimit(ip, { maxRequests: 5, windowMs: 60 * 60 * 1000 });
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'تجاوزت الحد المسموح. حاول بعد ساعة.', 
          code: 'RATE_LIMIT_EXCEEDED',
          resetAt: rateLimit.resetAt.toISOString(),
        },
        { status: 429 }
      );
    }
    
    // Parse body
    const body = await request.json();
    
    // Validation
    const validation = validateRequest(bookMeetingSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'البيانات غير صالحة', code: 'VALIDATION_ERROR', details: validation.errors },
        { status: 400 }
      );
    }
    
    const data = validation.data!;
    
    // التحقق من Turnstile/CAPTCHA
    if (data.turnstile_token) {
      const captchaValid = await verifyTurnstile(data.turnstile_token);
      if (!captchaValid) {
        return NextResponse.json(
          { error: 'فشل التحقق من reCAPTCHA', code: 'CAPTCHA_FAILED' },
          { status: 400 }
        );
      }
    }
    
    // إنشاء الاجتماع
    const result = await createMeeting(data, ip, userAgent);
    
    if (!result.success || !result.meeting) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: result.code === 'EMPLOYEE_NOT_FOUND' ? 404 : 400 }
      );
    }
    
    const meeting = result.meeting;
    
    // جلب معلومات الموظف
    const employee = await getEmployee(data.employee_id);
    
    // إنشاء حدث في Google Calendar (إذا كان مربوطاً)
    let googleMeetLink: string | undefined;
    try {
      const calendarResult = await createCalendarEvent(data.employee_id, {
        summary: `اجتماع: ${data.subject}`,
        description: `اجتماع مع ${data.client_name}\nالبريد: ${data.client_email}\n${data.notes || ''}`,
        startTime: new Date(meeting.start_at),
        endTime: new Date(meeting.end_at),
        attendeeEmail: data.client_email,
        attendeeName: data.client_name,
        createMeetLink: true,
      });
      
      if (calendarResult.success && calendarResult.eventId) {
        // تحديث الاجتماع بمعرف الحدث ورابط Meet
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase
          .from('meetings')
          .update({
            google_event_id: calendarResult.eventId,
            google_meet_link: calendarResult.meetLink,
          })
          .eq('id', meeting.id);
        
        googleMeetLink = calendarResult.meetLink;
      }
    } catch (calendarError) {
      console.error('Error creating calendar event:', calendarError);
      // نستمر حتى لو فشل إنشاء الحدث في التقويم
    }
    
    // إنشاء روابط التقويم
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jud-dashboard.netlify.app';
    const startTime = new Date(meeting.start_at);
    const endTime = new Date(meeting.end_at);
    
    const googleCalendarUrl = new URL('https://calendar.google.com/calendar/render');
    googleCalendarUrl.searchParams.set('action', 'TEMPLATE');
    googleCalendarUrl.searchParams.set('text', data.subject);
    googleCalendarUrl.searchParams.set('dates', `${formatGoogleDate(startTime)}/${formatGoogleDate(endTime)}`);
    googleCalendarUrl.searchParams.set('details', data.notes || '');
    
    const outlookUrl = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
    outlookUrl.searchParams.set('subject', data.subject);
    outlookUrl.searchParams.set('startdt', startTime.toISOString());
    outlookUrl.searchParams.set('enddt', endTime.toISOString());
    outlookUrl.searchParams.set('body', data.notes || '');
    
    return NextResponse.json({
      success: true,
      meeting: {
        id: meeting.id,
        datetime: meeting.start_at,
        duration_minutes: meeting.duration_minutes,
        subject: meeting.subject,
        employee: employee ? {
          name: employee.name,
          email: employee.email,
        } : null,
        confirmation_url: `${baseUrl}/meetings/${meeting.id}?token=${meeting.confirmation_token}`,
        cancel_url: `${baseUrl}/meetings/${meeting.id}/cancel?token=${meeting.cancel_token}`,
        reschedule_url: `${baseUrl}/meetings/${meeting.id}/reschedule?token=${meeting.reschedule_token}`,
        google_meet_link: googleMeetLink,
        calendar_links: {
          google: googleCalendarUrl.toString(),
          outlook: outlookUrl.toString(),
          ical: `${baseUrl}/api/meetings/${meeting.id}/ical`,
        },
      },
      message: 'تم حجز الاجتماع بنجاح. تم إرسال تأكيد إلى بريدك الإلكتروني.',
    });
    
  } catch (error) {
    console.error('Error in /api/meetings/book:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// تنسيق التاريخ لـ Google Calendar
function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
