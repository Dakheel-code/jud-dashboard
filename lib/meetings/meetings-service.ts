/**
 * MeetingsService - إنشاء/إلغاء/إعادة جدولة الاجتماعات
 */

import { createClient } from '@supabase/supabase-js';
import type { Meeting, MeetingLog, BookMeetingRequest, MeetingStatus } from './types';
import { createMeetingToken, generateSecureToken, verifyMeetingToken } from './encryption';
import { isSlotAvailable, getEmployeeSettings, getTodayMeetingsCount } from './availability-service';
import { notifyMeetingCreated, notifyMeetingCancelled, notifyMeetingRescheduled } from './notification-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials missing');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * جلب معلومات الموظف
 */
export async function getEmployee(employeeId: string): Promise<{
  id: string;
  name: string;
  email: string;
  avatar?: string;
  title?: string;
} | null> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, name, email, avatar, role')
    .eq('id', employeeId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    avatar: data.avatar,
    title: data.role,
  };
}

/**
 * التحقق من idempotency key
 */
async function checkIdempotencyKey(key: string): Promise<Meeting | null> {
  const supabase = getSupabase();
  
  // البحث عن اجتماع بنفس الـ idempotency key في آخر ساعة
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data } = await supabase
    .from('meetings')
    .select('*')
    .eq('ip_address', key) // نستخدم ip_address مؤقتاً لتخزين idempotency key
    .gte('created_at', oneHourAgo)
    .single();
  
  return data;
}

/**
 * إنشاء اجتماع جديد
 */
export async function createMeeting(
  request: BookMeetingRequest,
  ipAddress?: string,
  userAgent?: string
): Promise<{
  success: boolean;
  meeting?: Meeting;
  error?: string;
  code?: string;
}> {
  const supabase = getSupabase();
  
  // التحقق من وجود الموظف
  const employee = await getEmployee(request.employee_id);
  if (!employee) {
    return { success: false, error: 'الموظف غير موجود', code: 'EMPLOYEE_NOT_FOUND' };
  }
  
  // جلب إعدادات الموظف
  const settings = await getEmployeeSettings(request.employee_id);
  if (!settings) {
    return { success: false, error: 'لم يتم العثور على إعدادات الموظف', code: 'SETTINGS_NOT_FOUND' };
  }
  
  if (!settings.is_accepting_meetings) {
    return { success: false, error: 'الموظف لا يقبل اجتماعات حالياً', code: 'NOT_ACCEPTING_MEETINGS' };
  }
  
  // التحقق من الحد اليومي
  const todayCount = await getTodayMeetingsCount(request.employee_id);
  if (todayCount >= settings.max_meetings_per_day) {
    return { success: false, error: 'تم الوصول للحد الأقصى من الاجتماعات اليوم', code: 'MAX_MEETINGS_REACHED' };
  }
  
  // التحقق من توفر الوقت
  const datetime = new Date(request.datetime);
  const available = await isSlotAvailable(request.employee_id, datetime, request.duration_minutes);
  if (!available) {
    return { success: false, error: 'الوقت المحدد غير متاح', code: 'SLOT_NOT_AVAILABLE' };
  }
  
  // التحقق من idempotency key
  if (request.idempotency_key) {
    const existingMeeting = await checkIdempotencyKey(request.idempotency_key);
    if (existingMeeting) {
      return { success: true, meeting: existingMeeting };
    }
  }
  
  // حساب وقت النهاية
  const endAt = new Date(datetime.getTime() + request.duration_minutes * 60000);
  
  // إنشاء tokens
  const confirmationToken = generateSecureToken();
  const cancelToken = createMeetingToken({
    meeting_id: '', // سيتم تحديثه بعد الإنشاء
    client_email: request.client_email,
    action: 'cancel',
  });
  const rescheduleToken = createMeetingToken({
    meeting_id: '',
    client_email: request.client_email,
    action: 'reschedule',
  });
  
  // إنشاء الاجتماع
  const { data: meeting, error } = await supabase
    .from('meetings')
    .insert({
      employee_id: request.employee_id,
      meeting_type_id: request.meeting_type_id || null,
      client_name: request.client_name,
      client_email: request.client_email,
      client_phone: request.client_phone || null,
      client_company: request.client_company || null,
      subject: request.subject,
      notes: request.notes || null,
      start_at: datetime.toISOString(),
      end_at: endAt.toISOString(),
      duration_minutes: request.duration_minutes,
      timezone: 'Asia/Riyadh',
      status: 'confirmed',
      confirmation_token: confirmationToken,
      cancel_token: cancelToken,
      reschedule_token: rescheduleToken,
      token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 يوم
      source: 'booking_page',
      ip_address: request.idempotency_key || ipAddress,
      user_agent: userAgent,
    })
    .select()
    .single();
  
  if (error || !meeting) {
    console.error('Error creating meeting:', error);
    return { success: false, error: 'فشل إنشاء الاجتماع', code: 'CREATE_FAILED' };
  }
  
  // تحديث tokens بمعرف الاجتماع
  const updatedCancelToken = createMeetingToken({
    meeting_id: meeting.id,
    client_email: request.client_email,
    action: 'cancel',
  });
  const updatedRescheduleToken = createMeetingToken({
    meeting_id: meeting.id,
    client_email: request.client_email,
    action: 'reschedule',
  });
  
  await supabase
    .from('meetings')
    .update({
      cancel_token: updatedCancelToken,
      reschedule_token: updatedRescheduleToken,
    })
    .eq('id', meeting.id);
  
  // تسجيل في السجل
  await logMeetingAction(meeting.id, 'created', 'client', null, ipAddress, userAgent);
  
  // إرسال الإشعارات (بدون انتظار)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const calendarLinks = {
    google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(request.subject)}&dates=${datetime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}/${endAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
  };
  
  notifyMeetingCreated({
    ...meeting,
    cancel_token: updatedCancelToken,
    reschedule_token: updatedRescheduleToken,
  }, calendarLinks).catch(err => console.error('Notification error:', err));
  
  return {
    success: true,
    meeting: {
      ...meeting,
      cancel_token: updatedCancelToken,
      reschedule_token: updatedRescheduleToken,
    },
  };
}

/**
 * جلب اجتماع بالـ ID
 */
export async function getMeetingById(meetingId: string): Promise<Meeting | null> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data;
}

/**
 * جلب اجتماع بالـ token
 */
export async function getMeetingByToken(
  token: string,
  action: 'cancel' | 'reschedule'
): Promise<{
  meeting?: Meeting;
  error?: string;
  code?: string;
}> {
  // التحقق من صحة الـ token
  const verification = verifyMeetingToken(token);
  if (!verification.valid || !verification.payload) {
    return { error: 'رابط غير صالح أو منتهي الصلاحية', code: 'INVALID_TOKEN' };
  }
  
  if (verification.payload.action !== action) {
    return { error: 'رابط غير صالح لهذا الإجراء', code: 'INVALID_ACTION' };
  }
  
  const meeting = await getMeetingById(verification.payload.meeting_id);
  if (!meeting) {
    return { error: 'الاجتماع غير موجود', code: 'MEETING_NOT_FOUND' };
  }
  
  return { meeting };
}

/**
 * إلغاء اجتماع
 */
export async function cancelMeeting(
  meetingId: string,
  reason?: string,
  cancelledBy: 'client' | 'employee' = 'client',
  performedById?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{
  success: boolean;
  error?: string;
  code?: string;
}> {
  const supabase = getSupabase();
  
  // جلب الاجتماع
  const meeting = await getMeetingById(meetingId);
  if (!meeting) {
    return { success: false, error: 'الاجتماع غير موجود', code: 'MEETING_NOT_FOUND' };
  }
  
  if (meeting.status === 'cancelled') {
    return { success: false, error: 'الاجتماع ملغي بالفعل', code: 'MEETING_ALREADY_CANCELLED' };
  }
  
  if (meeting.status === 'completed') {
    return { success: false, error: 'لا يمكن إلغاء اجتماع مكتمل', code: 'MEETING_COMPLETED' };
  }
  
  // تحديث الاجتماع
  const { error } = await supabase
    .from('meetings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      cancelled_by: cancelledBy,
    })
    .eq('id', meetingId);
  
  if (error) {
    console.error('Error cancelling meeting:', error);
    return { success: false, error: 'فشل إلغاء الاجتماع', code: 'CANCEL_FAILED' };
  }
  
  // تسجيل في السجل
  await logMeetingAction(meetingId, 'cancelled', cancelledBy, performedById, ipAddress, userAgent, { reason });
  
  // إرسال إشعارات الإلغاء (بدون انتظار)
  notifyMeetingCancelled(meeting, reason).catch(err => console.error('Notification error:', err));
  
  return { success: true };
}

/**
 * إعادة جدولة اجتماع
 */
export async function rescheduleMeeting(
  meetingId: string,
  newDatetime: Date,
  reason?: string,
  rescheduledBy: 'client' | 'employee' = 'client',
  performedById?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{
  success: boolean;
  meeting?: Meeting;
  error?: string;
  code?: string;
}> {
  const supabase = getSupabase();
  
  // جلب الاجتماع
  const meeting = await getMeetingById(meetingId);
  if (!meeting) {
    return { success: false, error: 'الاجتماع غير موجود', code: 'MEETING_NOT_FOUND' };
  }
  
  if (meeting.status === 'cancelled') {
    return { success: false, error: 'الاجتماع ملغي', code: 'MEETING_CANCELLED' };
  }
  
  if (meeting.status === 'completed') {
    return { success: false, error: 'لا يمكن إعادة جدولة اجتماع مكتمل', code: 'MEETING_COMPLETED' };
  }
  
  // التحقق من عدد مرات إعادة الجدولة
  if (meeting.reschedule_count >= 2) {
    return { success: false, error: 'تجاوزت الحد الأقصى لإعادة الجدولة (2 مرات)', code: 'MAX_RESCHEDULES_REACHED' };
  }
  
  // التحقق من أن الموعد الجديد قبل 24 ساعة على الأقل
  const meetingTime = new Date(meeting.start_at);
  const now = new Date();
  const hoursUntilMeeting = (meetingTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntilMeeting < 24) {
    return { success: false, error: 'لا يمكن إعادة الجدولة قبل أقل من 24 ساعة', code: 'TOO_LATE_TO_RESCHEDULE' };
  }
  
  // التحقق من توفر الوقت الجديد
  const available = await isSlotAvailable(meeting.employee_id, newDatetime, meeting.duration_minutes, meetingId);
  if (!available) {
    return { success: false, error: 'الوقت الجديد غير متاح', code: 'SLOT_NOT_AVAILABLE' };
  }
  
  // حساب وقت النهاية الجديد
  const newEndAt = new Date(newDatetime.getTime() + meeting.duration_minutes * 60000);
  
  // تحديث الاجتماع
  const { data: updatedMeeting, error } = await supabase
    .from('meetings')
    .update({
      start_at: newDatetime.toISOString(),
      end_at: newEndAt.toISOString(),
      original_start_at: meeting.original_start_at || meeting.start_at,
      rescheduled_at: new Date().toISOString(),
      rescheduled_by: rescheduledBy,
      reschedule_count: meeting.reschedule_count + 1,
      status: 'rescheduled',
    })
    .eq('id', meetingId)
    .select()
    .single();
  
  if (error || !updatedMeeting) {
    console.error('Error rescheduling meeting:', error);
    return { success: false, error: 'فشل إعادة جدولة الاجتماع', code: 'RESCHEDULE_FAILED' };
  }
  
  // تسجيل في السجل
  await logMeetingAction(
    meetingId,
    'rescheduled',
    rescheduledBy,
    performedById,
    ipAddress,
    userAgent,
    {
      old_start_at: meeting.start_at,
      new_start_at: newDatetime.toISOString(),
      reason,
    }
  );
  
  // إرسال إشعارات إعادة الجدولة (بدون انتظار)
  notifyMeetingRescheduled(updatedMeeting, meeting.start_at).catch(err => console.error('Notification error:', err));
  
  return { success: true, meeting: updatedMeeting };
}

/**
 * تحديث حالة الاجتماع
 */
export async function updateMeetingStatus(
  meetingId: string,
  status: MeetingStatus,
  performedById?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('meetings')
    .update({ status })
    .eq('id', meetingId);
  
  if (error) {
    return { success: false, error: 'فشل تحديث الحالة' };
  }
  
  await logMeetingAction(meetingId, status, 'employee', performedById);
  
  return { success: true };
}

/**
 * تسجيل إجراء في سجل الاجتماعات
 */
export async function logMeetingAction(
  meetingId: string,
  action: string,
  performedBy: 'client' | 'employee' | 'system',
  performedById?: string | null,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabase();
  
  const logEntry: Partial<MeetingLog> = {
    meeting_id: meetingId,
    action,
    performed_by: performedBy,
    performed_by_id: performedById || undefined,
    ip_address: ipAddress,
    user_agent: userAgent,
    metadata: metadata,
  };
  
  if (metadata?.old_start_at) {
    logEntry.old_start_at = metadata.old_start_at as string;
  }
  if (metadata?.new_start_at) {
    logEntry.new_start_at = metadata.new_start_at as string;
  }
  if (metadata?.reason) {
    logEntry.reason = metadata.reason as string;
  }
  
  const { error } = await supabase
    .from('meeting_logs')
    .insert(logEntry);
  
  if (error) {
    console.error('Error logging meeting action:', error);
  }
}

/**
 * جلب اجتماعات الموظف
 */
export async function getEmployeeMeetings(
  employeeId: string,
  options: {
    status?: MeetingStatus;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  } = {}
): Promise<{
  meetings: Meeting[];
  total: number;
}> {
  const supabase = getSupabase();
  const { status, startDate, endDate, page = 1, limit = 20 } = options;
  
  let query = supabase
    .from('meetings')
    .select('*', { count: 'exact' })
    .eq('employee_id', employeeId)
    .order('start_at', { ascending: false });
  
  if (status) {
    query = query.eq('status', status);
  }
  
  if (startDate) {
    query = query.gte('start_at', startDate.toISOString());
  }
  
  if (endDate) {
    query = query.lte('start_at', endDate.toISOString());
  }
  
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);
  
  const { data, count, error } = await query;
  
  if (error) {
    console.error('Error fetching employee meetings:', error);
    return { meetings: [], total: 0 };
  }
  
  return { meetings: data || [], total: count || 0 };
}

/**
 * إحصائيات الاجتماعات للموظف
 */
export async function getMeetingStats(employeeId: string): Promise<{
  today: number;
  this_week: number;
  this_month: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  no_show: number;
  total: number;
}> {
  const supabase = getSupabase();
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // جلب جميع الإحصائيات بالتوازي
  const [
    todayResult,
    weekResult,
    monthResult,
    upcomingResult,
    completedResult,
    cancelledResult,
    noShowResult,
    totalResult,
  ] = await Promise.all([
    supabase.from('meetings').select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)
      .gte('start_at', today.toISOString())
      .lt('start_at', tomorrow.toISOString()),
    supabase.from('meetings').select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)
      .gte('start_at', weekStart.toISOString()),
    supabase.from('meetings').select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)
      .gte('start_at', monthStart.toISOString()),
    supabase.from('meetings').select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)
      .eq('status', 'confirmed')
      .gte('start_at', now.toISOString()),
    supabase.from('meetings').select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)
      .eq('status', 'completed'),
    supabase.from('meetings').select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)
      .eq('status', 'cancelled'),
    supabase.from('meetings').select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId)
      .eq('status', 'no_show'),
    supabase.from('meetings').select('*', { count: 'exact', head: true })
      .eq('employee_id', employeeId),
  ]);
  
  return {
    today: todayResult.count || 0,
    this_week: weekResult.count || 0,
    this_month: monthResult.count || 0,
    upcoming: upcomingResult.count || 0,
    completed: completedResult.count || 0,
    cancelled: cancelledResult.count || 0,
    no_show: noShowResult.count || 0,
    total: totalResult.count || 0,
  };
}
