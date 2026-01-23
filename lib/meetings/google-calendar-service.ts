/**
 * GoogleCalendarService - التكامل مع Google Calendar
 * 
 * قواعد صارمة:
 * - لا نخزن access_token طويل المدى
 * - كل عملية: refresh → access → execute → discard
 * - refresh_token مشفر دائماً
 */

import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from './encryption';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials missing');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Google Calendar API URLs
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface GoogleEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: {
        type: string;
      };
    };
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
    }>;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
}

interface GoogleOAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * جلب حساب Google OAuth للموظف
 */
export async function getGoogleAccount(employeeId: string): Promise<{
  id: string;
  google_email: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  calendar_id: string | null;
} | null> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('google_oauth_accounts')
    .select('id, google_email, access_token, refresh_token, token_expires_at, calendar_id')
    .eq('employee_id', employeeId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  // فك تشفير الـ tokens
  return {
    ...data,
    access_token: data.access_token ? decrypt(data.access_token) : null,
    refresh_token: data.refresh_token ? decrypt(data.refresh_token) : null,
  };
}

/**
 * جلب access token جديد من refresh token
 * 
 * قاعدة صارمة: لا نخزن access_token - نجلبه عند كل عملية ونتخلص منه بعدها
 */
export async function getFreshAccessToken(employeeId: string): Promise<string | null> {
  const account = await getGoogleAccount(employeeId);
  if (!account || !account.refresh_token) {
    console.error('No refresh token found for employee:', employeeId);
    return null;
  }
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.error('Google OAuth credentials not configured');
    return null;
  }
  
  try {
    const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: account.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to refresh token:', errorText);
      
      // تحديث حالة الخطأ في قاعدة البيانات
      const supabase = getSupabase();
      await supabase
        .from('google_oauth_accounts')
        .update({ sync_error: errorText })
        .eq('id', account.id);
      
      return null;
    }
    
    const tokens: GoogleOAuthTokens = await response.json();
    
    // تحديث last_sync_at فقط - لا نخزن access_token
    const supabase = getSupabase();
    await supabase
      .from('google_oauth_accounts')
      .update({
        last_sync_at: new Date().toISOString(),
        sync_error: null,
      })
      .eq('id', account.id);
    
    // إرجاع access_token للاستخدام المؤقت فقط
    return tokens.access_token;
  } catch (error) {
    console.error('Error getting fresh access token:', error);
    return null;
  }
}

/**
 * جلب access token صالح (alias للتوافق)
 * كل مرة نجلب token جديد - لا نخزنه
 */
export async function getValidAccessToken(employeeId: string): Promise<string | null> {
  return getFreshAccessToken(employeeId);
}

/**
 * @deprecated استخدم getFreshAccessToken بدلاً منها
 */
export async function refreshAccessToken(employeeId: string): Promise<string | null> {
  return getFreshAccessToken(employeeId);
}

/**
 * إنشاء حدث في Google Calendar
 */
export async function createCalendarEvent(
  employeeId: string,
  event: {
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendeeEmail: string;
    attendeeName: string;
    createMeetLink?: boolean;
  }
): Promise<{
  success: boolean;
  eventId?: string;
  meetLink?: string;
  error?: string;
}> {
  const accessToken = await getValidAccessToken(employeeId);
  if (!accessToken) {
    return { success: false, error: 'لم يتم ربط حساب Google Calendar' };
  }
  
  const account = await getGoogleAccount(employeeId);
  const calendarId = account?.calendar_id || 'primary';
  
  const googleEvent: GoogleEvent = {
    summary: event.summary,
    description: event.description,
    start: {
      dateTime: event.startTime.toISOString(),
      timeZone: 'Asia/Riyadh',
    },
    end: {
      dateTime: event.endTime.toISOString(),
      timeZone: 'Asia/Riyadh',
    },
    attendees: [
      {
        email: event.attendeeEmail,
        displayName: event.attendeeName,
      },
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 24 ساعة
        { method: 'popup', minutes: 60 }, // ساعة واحدة
      ],
    },
  };
  
  // إضافة Google Meet إذا مطلوب
  if (event.createMeetLink) {
    googleEvent.conferenceData = {
      createRequest: {
        requestId: `meeting-${Date.now()}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet',
        },
      },
    };
  }
  
  try {
    const url = new URL(`${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`);
    if (event.createMeetLink) {
      url.searchParams.set('conferenceDataVersion', '1');
    }
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(googleEvent),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to create calendar event:', error);
      
      // تحديث حالة الخطأ
      const supabase = getSupabase();
      await supabase
        .from('google_oauth_accounts')
        .update({ sync_error: error })
        .eq('employee_id', employeeId);
      
      return { success: false, error: 'فشل إنشاء الحدث في التقويم' };
    }
    
    const createdEvent = await response.json();
    
    // استخراج رابط Google Meet
    let meetLink: string | undefined;
    if (createdEvent.conferenceData?.entryPoints) {
      const videoEntry = createdEvent.conferenceData.entryPoints.find(
        (ep: { entryPointType: string }) => ep.entryPointType === 'video'
      );
      meetLink = videoEntry?.uri;
    }
    
    return {
      success: true,
      eventId: createdEvent.id,
      meetLink,
    };
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return { success: false, error: 'خطأ في الاتصال بـ Google Calendar' };
  }
}

/**
 * تحديث حدث في Google Calendar
 */
export async function updateCalendarEvent(
  employeeId: string,
  eventId: string,
  updates: {
    summary?: string;
    description?: string;
    startTime?: Date;
    endTime?: Date;
  }
): Promise<{
  success: boolean;
  error?: string;
}> {
  const accessToken = await getValidAccessToken(employeeId);
  if (!accessToken) {
    return { success: false, error: 'لم يتم ربط حساب Google Calendar' };
  }
  
  const account = await getGoogleAccount(employeeId);
  const calendarId = account?.calendar_id || 'primary';
  
  const updateData: Partial<GoogleEvent> = {};
  
  if (updates.summary) {
    updateData.summary = updates.summary;
  }
  if (updates.description) {
    updateData.description = updates.description;
  }
  if (updates.startTime) {
    updateData.start = {
      dateTime: updates.startTime.toISOString(),
      timeZone: 'Asia/Riyadh',
    };
  }
  if (updates.endTime) {
    updateData.end = {
      dateTime: updates.endTime.toISOString(),
      timeZone: 'Asia/Riyadh',
    };
  }
  
  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to update calendar event:', error);
      return { success: false, error: 'فشل تحديث الحدث في التقويم' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return { success: false, error: 'خطأ في الاتصال بـ Google Calendar' };
  }
}

/**
 * حذف حدث من Google Calendar
 */
export async function deleteCalendarEvent(
  employeeId: string,
  eventId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  const accessToken = await getValidAccessToken(employeeId);
  if (!accessToken) {
    return { success: false, error: 'لم يتم ربط حساب Google Calendar' };
  }
  
  const account = await getGoogleAccount(employeeId);
  const calendarId = account?.calendar_id || 'primary';
  
  try {
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok && response.status !== 404) {
      const error = await response.text();
      console.error('Failed to delete calendar event:', error);
      return { success: false, error: 'فشل حذف الحدث من التقويم' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return { success: false, error: 'خطأ في الاتصال بـ Google Calendar' };
  }
}

/**
 * جلب أوقات الانشغال من Google Calendar (FreeBusy)
 */
export async function getFreeBusy(
  employeeId: string,
  startTime: Date,
  endTime: Date
): Promise<{
  success: boolean;
  busyTimes?: Array<{ start: Date; end: Date }>;
  error?: string;
}> {
  const accessToken = await getValidAccessToken(employeeId);
  if (!accessToken) {
    return { success: false, error: 'لم يتم ربط حساب Google Calendar' };
  }
  
  const account = await getGoogleAccount(employeeId);
  const calendarId = account?.calendar_id || 'primary';
  
  try {
    const response = await fetch(`${GOOGLE_CALENDAR_API}/freeBusy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: [{ id: calendarId }],
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to get free/busy:', error);
      return { success: false, error: 'فشل جلب أوقات الانشغال' };
    }
    
    const data = await response.json();
    const busyTimes = data.calendars?.[calendarId]?.busy || [];
    
    return {
      success: true,
      busyTimes: busyTimes.map((b: { start: string; end: string }) => ({
        start: new Date(b.start),
        end: new Date(b.end),
      })),
    };
  } catch (error) {
    console.error('Error getting free/busy:', error);
    return { success: false, error: 'خطأ في الاتصال بـ Google Calendar' };
  }
}

/**
 * حفظ tokens جديدة للموظف
 */
export async function saveGoogleTokens(
  employeeId: string,
  tokens: {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  },
  googleEmail: string,
  calendarId?: string
): Promise<boolean> {
  const supabase = getSupabase();
  
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  
  const { error } = await supabase
    .from('google_oauth_accounts')
    .upsert({
      employee_id: employeeId,
      google_email: googleEmail,
      access_token: encrypt(tokens.access_token),
      refresh_token: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      token_expires_at: expiresAt.toISOString(),
      calendar_id: calendarId || 'primary',
      sync_enabled: true,
      last_sync_at: new Date().toISOString(),
    }, {
      onConflict: 'employee_id',
    });
  
  if (error) {
    console.error('Error saving Google tokens:', error);
    return false;
  }
  
  return true;
}

/**
 * إلغاء ربط حساب Google
 */
export async function disconnectGoogleAccount(employeeId: string): Promise<boolean> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('google_oauth_accounts')
    .delete()
    .eq('employee_id', employeeId);
  
  if (error) {
    console.error('Error disconnecting Google account:', error);
    return false;
  }
  
  return true;
}
