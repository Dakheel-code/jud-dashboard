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

// أوقات العمل الافتراضية
const DEFAULT_WORKING_HOURS: Record<number, { start: string; end: string; enabled: boolean }> = {
  0: { start: '09:00', end: '17:00', enabled: true },  // الأحد
  1: { start: '09:00', end: '17:00', enabled: true },  // الإثنين
  2: { start: '09:00', end: '17:00', enabled: true },  // الثلاثاء
  3: { start: '09:00', end: '17:00', enabled: true },  // الأربعاء
  4: { start: '09:00', end: '17:00', enabled: true },  // الخميس
  5: { start: '09:00', end: '17:00', enabled: false }, // الجمعة
  6: { start: '09:00', end: '17:00', enabled: false }, // السبت
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, start_date, end_date, duration = 30 } = body;
    
    if (!employee_id) {
      return NextResponse.json(
        { error: 'employee_id مطلوب', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabase();
    
    // جلب أوقات العمل من قاعدة البيانات
    const { data: availability } = await supabase
      .from('employee_availability')
      .select('day_of_week, start_time, end_time, is_enabled')
      .eq('employee_id', employee_id);
    
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
    
    // إنشاء الأوقات المتاحة
    const slots: any[] = [];
    const startDateObj = start_date ? new Date(start_date) : new Date();
    const endDateObj = end_date ? new Date(end_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    // التأكد من أن تاريخ البداية ليس في الماضي
    const now = new Date();
    if (startDateObj < now) {
      startDateObj.setTime(now.getTime());
    }
    
    // إنشاء slots لكل يوم
    const currentDate = new Date(startDateObj);
    currentDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= endDateObj && slots.length < 100) {
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
          // تخطي الأوقات الماضية
          if (slotTime > now) {
            slots.push({
              datetime: slotTime.toISOString(),
              duration: duration,
              formatted_date: formatDateArabic(slotTime),
              formatted_time: formatTimeArabic(slotTime),
            });
          }
          
          slotTime.setMinutes(slotTime.getMinutes() + duration);
        }
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return NextResponse.json({
      success: true,
      available_slots: slots,
    });
    
  } catch (error) {
    console.error('Error in /api/meetings/slots:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم: ' + (error instanceof Error ? error.message : 'Unknown'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
