/**
 * أنواع نظام الاجتماعات
 */

// حالات الاجتماع
export type MeetingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'rescheduled';

// مصدر الاجتماع
export type MeetingSource = 'booking_page' | 'admin' | 'api';

// من قام بالإجراء
export type PerformedBy = 'client' | 'employee' | 'system';

// نوع الاجتماع
export interface MeetingType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  duration_minutes: number;
  buffer_before: number;
  buffer_after: number;
  color: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// إعدادات الموظف للاجتماعات
export interface EmployeeMeetingSettings {
  id: string;
  employee_id: string;
  booking_slug?: string;
  slot_duration: number;
  buffer_before: number;
  buffer_after: number;
  max_advance_days: number;
  min_notice_hours: number;
  max_meetings_per_day: number;
  is_accepting_meetings: boolean;
  welcome_message?: string;
  created_at: string;
  updated_at: string;
}

// أوقات العمل
export interface EmployeeAvailability {
  id: string;
  employee_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// الإجازات
export interface EmployeeTimeOff {
  id: string;
  employee_id: string;
  type: string;
  start_at: string;
  end_at: string;
  title?: string;
  reason?: string;
  is_recurring: boolean;
  recurrence_rule?: string;
  created_at: string;
  updated_at: string;
}

// حساب Google OAuth
export interface GoogleOAuthAccount {
  id: string;
  employee_id: string;
  google_email: string;
  google_id?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  calendar_id?: string;
  calendar_name?: string;
  sync_enabled: boolean;
  last_sync_at?: string;
  sync_error?: string;
  webhook_channel_id?: string;
  webhook_resource_id?: string;
  webhook_expires_at?: string;
  created_at: string;
  updated_at: string;
}

// الاجتماع
export interface Meeting {
  id: string;
  employee_id: string;
  meeting_type_id?: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_company?: string;
  subject: string;
  notes?: string;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  timezone: string;
  status: MeetingStatus;
  google_event_id?: string;
  google_calendar_id?: string;
  google_meet_link?: string;
  confirmation_token?: string;
  cancel_token?: string;
  reschedule_token?: string;
  token_expires_at?: string;
  reschedule_count: number;
  original_start_at?: string;
  rescheduled_at?: string;
  rescheduled_by?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  reminder_24h_sent: boolean;
  reminder_1h_sent: boolean;
  source: MeetingSource;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

// سجل الاجتماع
export interface MeetingLog {
  id: string;
  meeting_id: string;
  action: string;
  old_start_at?: string;
  new_start_at?: string;
  reason?: string;
  performed_by: PerformedBy;
  performed_by_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// فترة زمنية متاحة
export interface AvailableSlot {
  datetime: string;
  duration: number;
  formatted_date: string;
  formatted_time: string;
}

// طلب جلب الأوقات المتاحة
export interface GetSlotsRequest {
  employee_id: string;
  start_date: string;
  end_date: string;
  duration?: number;
}

// استجابة الأوقات المتاحة
export interface GetSlotsResponse {
  success: boolean;
  employee: {
    id: string;
    name: string;
    avatar?: string;
    title?: string;
  };
  settings: {
    slot_duration: number;
    min_notice_hours: number;
    max_advance_days: number;
  };
  available_slots: AvailableSlot[];
}

// طلب حجز اجتماع
export interface BookMeetingRequest {
  employee_id: string;
  datetime: string;
  duration_minutes: number;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_company?: string;
  subject: string;
  notes?: string;
  meeting_type_id?: string;
  turnstile_token?: string;
  idempotency_key?: string;
}

// استجابة حجز اجتماع
export interface BookMeetingResponse {
  success: boolean;
  meeting: {
    id: string;
    datetime: string;
    duration_minutes: number;
    subject: string;
    employee: {
      name: string;
      email: string;
    };
    confirmation_url: string;
    cancel_url: string;
    reschedule_url: string;
    google_meet_link?: string;
    calendar_links: {
      google: string;
      outlook: string;
      ical: string;
    };
  };
  message: string;
}

// طلب إلغاء اجتماع
export interface CancelMeetingRequest {
  token: string;
  reason?: string;
}

// طلب إعادة جدولة اجتماع
export interface RescheduleMeetingRequest {
  token: string;
  new_datetime: string;
  reason?: string;
}

// إحصائيات الاجتماعات
export interface MeetingStats {
  today: number;
  this_week: number;
  this_month: number;
  upcoming: number;
  completed: number;
  cancelled: number;
  no_show: number;
  total: number;
}

// Rate Limit
export interface RateLimitEntry {
  id: string;
  ip_address: string;
  fingerprint?: string;
  request_count: number;
  window_start: string;
  window_end: string;
  created_at: string;
}
