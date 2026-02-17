/**
 * API: جلب الأوقات المتاحة
 * POST /api/meetings/slots
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials missing');
  }
  return createClient(supabaseUrl, supabaseKey);
}

// أسماء الأيام بالعربية
const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function formatDateArabic(date: Date): string {
  const dayName = ARABIC_DAYS[date.getDay()];
  const day = date.getDate();
  const month = ARABIC_MONTHS[date.getMonth()];
  return `${dayName}، ${day} ${month}`;
}

function formatTimeArabic(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'م' : 'ص';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}

// أوقات العمل الافتراضية (جميع الأيام مفعلة افتراضياً ما عدا الجمعة)
const DEFAULT_WORKING_HOURS: Record<number, { start: string; end: string; enabled: boolean }> = {
  0: { start: '09:00', end: '17:00', enabled: true },  // الأحد
  1: { start: '09:00', end: '17:00', enabled: true },  // الإثنين
  2: { start: '09:00', end: '17:00', enabled: true },  // الثلاثاء
  3: { start: '09:00', end: '17:00', enabled: true },  // الأربعاء
  4: { start: '09:00', end: '17:00', enabled: true },  // الخميس
  5: { start: '09:00', end: '17:00', enabled: false }, // الجمعة
  6: { start: '09:00', end: '17:00', enabled: true },  // السبت
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, start_date, end_date } = body;
    
    if (!employee_id) {
      return NextResponse.json(
        { error: 'employee_id مطلوب', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabase();
    
    // البحث عن الموظف باستخدام booking_slug أو username أو employee_id
    let actualEmployeeId = employee_id;
    
    // أولاً: البحث عن الموظف بالـ username للحصول على الـ ID الفعلي
    const { data: userByUsername } = await supabase
      .from('admin_users')
      .select('id')
      .eq('username', employee_id)
      .single();
    
    if (userByUsername) {
      actualEmployeeId = userByUsername.id;
    }
    
    // محاولة البحث بالـ slug أولاً
    const { data: settingsBySlug } = await supabase
      .from('employee_meeting_settings')
      .select('employee_id, slot_duration, min_notice_hours, max_advance_days, buffer_before, buffer_after, welcome_message')
      .eq('booking_slug', employee_id)
      .single();
    
    let settingsData = settingsBySlug;
    
    if (settingsBySlug) {
      actualEmployeeId = settingsBySlug.employee_id;
    } else {
      // البحث بالـ employee_id مباشرة
      const { data: settingsById } = await supabase
        .from('employee_meeting_settings')
        .select('employee_id, slot_duration, min_notice_hours, max_advance_days, buffer_before, buffer_after, welcome_message')
        .eq('employee_id', actualEmployeeId)
        .single();
      settingsData = settingsById;
    }

    // استخدام الإعدادات أو القيم الافتراضية
    const slotDuration = settingsData?.slot_duration || 30;
    const minNoticeHours = settingsData?.min_notice_hours || 4;
    const maxDaysAhead = settingsData?.max_advance_days || 60;
    const bufferMinutes = (settingsData?.buffer_before || 5) + (settingsData?.buffer_after || 5);


    // حساب الحد الأدنى للإشعار بالدقائق (min_notice_hours هو بالساعات)
    const minNoticeMinutes = minNoticeHours * 60;
    
    // جلب أوقات العمل من قاعدة البيانات
    const { data: availability, error: availError } = await supabase
      .from('employee_availability')
      .select('day_of_week, start_time, end_time, is_enabled')
      .eq('employee_id', actualEmployeeId);
    
    
    // تحويل أوقات العمل إلى map
    const workingHours: Record<number, { start: string; end: string; enabled: boolean }> = { ...DEFAULT_WORKING_HOURS };
    
    if (availability && availability.length > 0) {
      availability.forEach((a: any) => {
        workingHours[a.day_of_week] = {
          start: a.start_time?.substring(0, 5) || '09:00',
          end: a.end_time?.substring(0, 5) || '17:00',
          enabled: a.is_enabled ?? true,
        };
      });
    }
    
    // إذا لم توجد إعدادات في قاعدة البيانات، استخدم الافتراضي مع تفعيل السبت
    if (!availability || availability.length === 0) {
      // تفعيل السبت افتراضياً للاختبار
      workingHours[6] = { start: '09:00', end: '17:00', enabled: true };
    }
    
    
    // إنشاء الأوقات المتاحة
    const slots: any[] = [];
    const now = new Date();
    
    // حساب أقرب وقت يمكن الحجز فيه (الآن + الحد الأدنى للإشعار)
    const earliestBookingTime = new Date(now.getTime() + minNoticeMinutes * 60 * 1000);
    
    // تاريخ البداية
    const startDateObj = start_date ? new Date(start_date) : new Date();
    if (startDateObj < earliestBookingTime) {
      startDateObj.setTime(earliestBookingTime.getTime());
    }
    
    // تاريخ النهاية (نطاق الحجز) - استخدام maxDaysAhead من الإعدادات
    const maxEndDate = new Date(now.getTime() + maxDaysAhead * 24 * 60 * 60 * 1000);
    const requestedEndDate = end_date ? new Date(end_date) : maxEndDate;
    // استخدام الأكبر لضمان تغطية كل الأيام المطلوبة
    const endDateObj = requestedEndDate > maxEndDate ? requestedEndDate : maxEndDate;
    
    
    // إنشاء slots لكل يوم
    const currentDate = new Date(startDateObj);
    currentDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= endDateObj && slots.length < 2000) {
      const dayOfWeek = currentDate.getDay();
      const dayHours = workingHours[dayOfWeek];
      
      if (dayHours && dayHours.enabled) {
        const [startHour, startMin] = dayHours.start.split(':').map(Number);
        const [endHour, endMin] = dayHours.end.split(':').map(Number);
        
        // إنشاء slots لهذا اليوم
        const slotTime = new Date(currentDate);
        slotTime.setHours(startHour, startMin, 0, 0);
        
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(endHour, endMin, 0, 0);
        
        while (slotTime < dayEnd) {
          // تخطي الأوقات قبل أقرب وقت للحجز
          if (slotTime >= earliestBookingTime) {
            slots.push({
              datetime: slotTime.toISOString(),
              duration: slotDuration,
              formatted_date: formatDateArabic(slotTime),
              formatted_time: formatTimeArabic(slotTime),
            });
          }
          
          // إضافة مدة الاجتماع + وقت الراحة
          slotTime.setMinutes(slotTime.getMinutes() + slotDuration + bufferMinutes);
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // جلب بيانات الموظف - البحث بالـ ID أو بالـ slug
    let employeeData = null;
    
    // محاولة البحث بالـ ID أولاً
    const { data: empById } = await supabase
      .from('admin_users')
      .select('id, name, username, avatar, title')
      .eq('id', actualEmployeeId)
      .single();
    
    
    if (empById) {
      employeeData = empById;
    } else {
      // محاولة البحث بالـ slug (username)
      const { data: empBySlug } = await supabase
        .from('admin_users')
        .select('id, name, username, avatar, title')
        .eq('username', employee_id)
        .single();
      employeeData = empBySlug;
    }
    
    // إذا كان name فارغ أو يساوي username، استخدم username كـ fallback
    if (employeeData && (!employeeData.name || employeeData.name === employeeData.username)) {
    }

    return NextResponse.json({
      success: true,
      available_slots: slots,
      employee: employeeData || { id: actualEmployeeId, name: employee_id },
      settings: {
        slot_duration: slotDuration,
        min_notice_hours: minNoticeHours,
        max_days_ahead: maxDaysAhead,
        buffer_minutes: bufferMinutes,
        meeting_title: settingsData?.welcome_message,
      },
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم: ' + (error instanceof Error ? error.message : 'Unknown'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
