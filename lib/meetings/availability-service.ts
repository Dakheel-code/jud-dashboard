/**
 * AvailabilityService - حساب الأوقات المتاحة
 */

import { createClient } from '@supabase/supabase-js';
import type { AvailableSlot, EmployeeAvailability, EmployeeMeetingSettings, EmployeeTimeOff, Meeting } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials missing');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// أسماء الأيام بالعربية
const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

/**
 * تنسيق التاريخ بالعربية
 */
function formatDateArabic(date: Date): string {
  const dayName = ARABIC_DAYS[date.getDay()];
  const day = date.getDate();
  const month = ARABIC_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}، ${day} ${month} ${year}`;
}

/**
 * تنسيق الوقت بالعربية
 */
function formatTimeArabic(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'م' : 'ص';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${period}`;
}

/**
 * جلب إعدادات الموظف
 */
export async function getEmployeeSettings(employeeId: string): Promise<EmployeeMeetingSettings | null> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('employee_meeting_settings')
    .select('*')
    .eq('employee_id', employeeId)
    .single();
  
  if (error || !data) {
    // إنشاء إعدادات افتراضية إذا لم تكن موجودة
    const { data: newSettings, error: insertError } = await supabase
      .from('employee_meeting_settings')
      .insert({
        employee_id: employeeId,
        slot_duration: 30,
        buffer_before: 15,
        buffer_after: 15,
        max_advance_days: 30,
        min_notice_hours: 24,
        max_meetings_per_day: 10,
        is_accepting_meetings: true,
      })
      .select()
      .single();
    
    if (insertError) {
      return null;
    }
    
    return newSettings;
  }
  
  return data;
}

/**
 * جلب أوقات عمل الموظف
 */
export async function getEmployeeAvailability(employeeId: string): Promise<EmployeeAvailability[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('employee_availability')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('is_enabled', true)
    .order('day_of_week');
  
  if (error) {
    return [];
  }
  
  // إذا لم تكن هناك أوقات محددة، أنشئ أوقات افتراضية
  if (!data || data.length === 0) {
    const defaultAvailability = [];
    // الأحد إلى الخميس (0-4)
    for (let day = 0; day <= 4; day++) {
      defaultAvailability.push({
        employee_id: employeeId,
        day_of_week: day,
        start_time: '09:00',
        end_time: '17:00',
        is_enabled: true,
      });
    }
    
    const { data: inserted, error: insertError } = await supabase
      .from('employee_availability')
      .insert(defaultAvailability)
      .select();
    
    if (insertError) {
      return [];
    }
    
    return inserted || [];
  }
  
  return data;
}

/**
 * جلب إجازات الموظف في فترة معينة
 */
export async function getEmployeeTimeOff(
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<EmployeeTimeOff[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('employee_time_off')
    .select('*')
    .eq('employee_id', employeeId)
    .or(`start_at.lte.${endDate.toISOString()},end_at.gte.${startDate.toISOString()}`);
  
  if (error) {
    return [];
  }
  
  return data || [];
}

/**
 * جلب الاجتماعات المحجوزة في فترة معينة
 */
export async function getBookedMeetings(
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<Meeting[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('employee_id', employeeId)
    .in('status', ['confirmed', 'rescheduled'])
    .gte('start_at', startDate.toISOString())
    .lte('start_at', endDate.toISOString());
  
  if (error) {
    return [];
  }
  
  return data || [];
}

/**
 * التحقق من أن الوقت ليس في إجازة
 */
function isInTimeOff(date: Date, timeOffs: EmployeeTimeOff[]): boolean {
  return timeOffs.some(timeOff => {
    const start = new Date(timeOff.start_at);
    const end = new Date(timeOff.end_at);
    return date >= start && date < end;
  });
}

/**
 * التحقق من أن الوقت ليس محجوزاً
 */
function isBooked(date: Date, duration: number, meetings: Meeting[], bufferBefore: number, bufferAfter: number): boolean {
  const slotStart = new Date(date.getTime() - bufferBefore * 60000);
  const slotEnd = new Date(date.getTime() + (duration + bufferAfter) * 60000);
  
  return meetings.some(meeting => {
    const meetingStart = new Date(meeting.start_at);
    const meetingEnd = new Date(meeting.end_at);
    
    // التحقق من التداخل
    return (slotStart < meetingEnd && slotEnd > meetingStart);
  });
}

/**
 * حساب الأوقات المتاحة
 */
export async function getAvailableSlots(
  employeeId: string,
  startDate: Date,
  endDate: Date,
  duration?: number
): Promise<{
  slots: AvailableSlot[];
  settings: EmployeeMeetingSettings | null;
  error?: string;
}> {
  // جلب الإعدادات
  const settings = await getEmployeeSettings(employeeId);
  if (!settings) {
    return { slots: [], settings: null, error: 'لم يتم العثور على إعدادات الموظف' };
  }
  
  if (!settings.is_accepting_meetings) {
    return { slots: [], settings, error: 'الموظف لا يقبل اجتماعات حالياً' };
  }
  
  const slotDuration = duration || settings.slot_duration;
  
  // جلب البيانات بالتوازي
  const [availability, timeOffs, bookedMeetings] = await Promise.all([
    getEmployeeAvailability(employeeId),
    getEmployeeTimeOff(employeeId, startDate, endDate),
    getBookedMeetings(employeeId, startDate, endDate),
  ]);
  
  // إنشاء خريطة لأوقات العمل حسب اليوم
  const availabilityMap = new Map<number, EmployeeAvailability>();
  availability.forEach(a => availabilityMap.set(a.day_of_week, a));
  
  const slots: AvailableSlot[] = [];
  const now = new Date();
  const minNoticeTime = new Date(now.getTime() + settings.min_notice_hours * 60 * 60 * 1000);
  
  // المرور على كل يوم في النطاق
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const dayAvailability = availabilityMap.get(dayOfWeek);
    
    if (dayAvailability && dayAvailability.is_enabled) {
      // تحويل أوقات العمل إلى Date objects
      const [startHour, startMinute] = dayAvailability.start_time.split(':').map(Number);
      const [endHour, endMinute] = dayAvailability.end_time.split(':').map(Number);
      
      const dayStart = new Date(currentDate);
      dayStart.setHours(startHour, startMinute, 0, 0);
      
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(endHour, endMinute, 0, 0);
      
      // إنشاء الفترات الزمنية
      let slotTime = new Date(dayStart);
      while (slotTime.getTime() + slotDuration * 60000 <= dayEnd.getTime()) {
        // التحقق من الشروط
        const isAfterMinNotice = slotTime >= minNoticeTime;
        const notInTimeOff = !isInTimeOff(slotTime, timeOffs);
        const notBooked = !isBooked(slotTime, slotDuration, bookedMeetings, settings.buffer_before, settings.buffer_after);
        
        if (isAfterMinNotice && notInTimeOff && notBooked) {
          slots.push({
            datetime: slotTime.toISOString(),
            duration: slotDuration,
            formatted_date: formatDateArabic(slotTime),
            formatted_time: formatTimeArabic(slotTime),
          });
        }
        
        // الانتقال للفترة التالية
        slotTime = new Date(slotTime.getTime() + slotDuration * 60000);
      }
    }
    
    // الانتقال لليوم التالي
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return { slots, settings };
}

/**
 * التحقق من توفر وقت محدد
 */
export async function isSlotAvailable(
  employeeId: string,
  datetime: Date,
  duration: number,
  excludeMeetingId?: string
): Promise<boolean> {
  const supabase = getSupabase();
  
  const endTime = new Date(datetime.getTime() + duration * 60000);
  
  // التحقق من عدم وجود تعارض مع اجتماعات أخرى
  let query = supabase
    .from('meetings')
    .select('id')
    .eq('employee_id', employeeId)
    .in('status', ['confirmed', 'rescheduled'])
    .or(`and(start_at.lt.${endTime.toISOString()},end_at.gt.${datetime.toISOString()})`);
  
  if (excludeMeetingId) {
    query = query.neq('id', excludeMeetingId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    // في حالة الخطأ، نسمح بالحجز
    return true;
  }
  
  // الوقت متاح إذا لم يكن هناك اجتماعات متعارضة
  return !data || data.length === 0;
}

/**
 * عدد الاجتماعات اليوم للموظف
 */
export async function getTodayMeetingsCount(employeeId: string): Promise<number> {
  const supabase = getSupabase();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const { count, error } = await supabase
    .from('meetings')
    .select('*', { count: 'exact', head: true })
    .eq('employee_id', employeeId)
    .in('status', ['confirmed', 'rescheduled'])
    .gte('start_at', today.toISOString())
    .lt('start_at', tomorrow.toISOString());
  
  if (error) {
    return 0;
  }
  
  return count || 0;
}
