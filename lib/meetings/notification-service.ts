/**
 * NotificationService - إرسال الإشعارات
 * 
 * قواعد صارمة:
 * - لا ترسل Meet link في Slack العام (فقط للموظف أو DM)
 * - Email للعميل والموظف
 * - Slack للموظف + قناة الإدارة
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Slack Configuration
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_ADMIN_CHANNEL_WEBHOOK = process.env.SLACK_ADMIN_CHANNEL_WEBHOOK;

// Email Configuration (Resend)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@jud-dashboard.com';

interface Meeting {
  id: string;
  employee_id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  subject: string;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  google_meet_link?: string;
  status: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  slack_user_id?: string;
}

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * جلب بيانات الموظف
 */
async function getEmployee(employeeId: string): Promise<Employee | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('admin_users')
    .select('id, name, email, slack_user_id')
    .eq('id', employeeId)
    .single();
  return data;
}

/**
 * تنسيق التاريخ والوقت
 */
function formatDateTime(dateString: string): { date: string; time: string } {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    time: date.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

// =====================================================
// SLACK NOTIFICATIONS
// =====================================================

/**
 * إرسال رسالة Slack للموظف (مع Meet link)
 */
async function sendSlackToEmployee(
  employee: Employee,
  meeting: Meeting,
  action: 'created' | 'cancelled' | 'rescheduled'
): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    return false;
  }

  const { date, time } = formatDateTime(meeting.start_at);
  
  const actionText = {
    created: '📅 اجتماع جديد',
    cancelled: '❌ تم إلغاء اجتماع',
    rescheduled: '🔄 تم إعادة جدولة اجتماع',
  }[action];

  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: actionText, emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*الموضوع:*\n${meeting.subject}` },
        { type: 'mrkdwn', text: `*العميل:*\n${meeting.client_name}` },
        { type: 'mrkdwn', text: `*التاريخ:*\n${date}` },
        { type: 'mrkdwn', text: `*الوقت:*\n${time}` },
        { type: 'mrkdwn', text: `*المدة:*\n${meeting.duration_minutes} دقيقة` },
        { type: 'mrkdwn', text: `*البريد:*\n${meeting.client_email}` },
      ],
    },
  ];

  // إضافة رابط Meet للموظف فقط (خاص)
  if (meeting.google_meet_link && action === 'created') {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `🔗 *رابط الاجتماع:* <${meeting.google_meet_link}|انضم الآن>` },
    });
  }

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * إرسال رسالة Slack لقناة الإدارة (بدون Meet link)
 */
async function sendSlackToAdminChannel(
  employee: Employee,
  meeting: Meeting,
  action: 'created' | 'cancelled' | 'rescheduled'
): Promise<boolean> {
  if (!SLACK_ADMIN_CHANNEL_WEBHOOK) {
    return false;
  }

  const { date, time } = formatDateTime(meeting.start_at);
  
  const actionText = {
    created: '📅 اجتماع جديد',
    cancelled: '❌ تم إلغاء اجتماع',
    rescheduled: '🔄 تم إعادة جدولة اجتماع',
  }[action];

  // قاعدة صارمة: لا Meet link في القناة العامة
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: actionText, emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*الموظف:*\n${employee.name}` },
        { type: 'mrkdwn', text: `*العميل:*\n${meeting.client_name}` },
        { type: 'mrkdwn', text: `*الموضوع:*\n${meeting.subject}` },
        { type: 'mrkdwn', text: `*التاريخ:*\n${date}` },
        { type: 'mrkdwn', text: `*الوقت:*\n${time}` },
        { type: 'mrkdwn', text: `*المدة:*\n${meeting.duration_minutes} دقيقة` },
      ],
    },
  ];

  try {
    const response = await fetch(SLACK_ADMIN_CHANNEL_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// =====================================================
// EMAIL NOTIFICATIONS
// =====================================================

/**
 * إرسال بريد إلكتروني
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject,
        html,
      }),
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * إرسال بريد للعميل عند إنشاء اجتماع
 */
async function sendClientBookingConfirmation(
  meeting: Meeting,
  employee: Employee,
  calendarLinks: { google?: string; outlook?: string }
): Promise<boolean> {
  const { date, time } = formatDateTime(meeting.start_at);
  
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #f8f5ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
        .info-row:last-child { border-bottom: none; }
        .label { color: #666; }
        .value { color: #333; font-weight: 500; }
        .btn { display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 5px; }
        .btn-secondary { background: #e5e5e5; color: #333; }
        .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ تم تأكيد الحجز</h1>
        </div>
        <div class="content">
          <p>مرحباً ${meeting.client_name}،</p>
          <p>تم تأكيد حجز اجتماعك بنجاح.</p>
          
          <div class="info-box">
            <div class="info-row">
              <span class="label">الموضوع:</span>
              <span class="value">${meeting.subject}</span>
            </div>
            <div class="info-row">
              <span class="label">مع:</span>
              <span class="value">${employee.name}</span>
            </div>
            <div class="info-row">
              <span class="label">التاريخ:</span>
              <span class="value">${date}</span>
            </div>
            <div class="info-row">
              <span class="label">الوقت:</span>
              <span class="value">${time}</span>
            </div>
            <div class="info-row">
              <span class="label">المدة:</span>
              <span class="value">${meeting.duration_minutes} دقيقة</span>
            </div>
            ${meeting.google_meet_link ? `
            <div class="info-row">
              <span class="label">رابط الاجتماع:</span>
              <span class="value"><a href="${meeting.google_meet_link}">Google Meet</a></span>
            </div>
            ` : ''}
          </div>
          
          <p style="text-align: center;">
            ${meeting.google_meet_link ? `<a href="${meeting.google_meet_link}" class="btn">انضم للاجتماع</a>` : ''}
            ${calendarLinks.google ? `<a href="${calendarLinks.google}" class="btn btn-secondary">إضافة للتقويم</a>` : ''}
          </p>
        </div>
        <div class="footer">
          <p>إذا كنت ترغب في إلغاء أو إعادة جدولة الاجتماع، يرجى استخدام الروابط المرسلة في البريد السابق.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(meeting.client_email, `تأكيد الحجز: ${meeting.subject}`, html);
}

/**
 * إرسال بريد للموظف عند إنشاء اجتماع
 */
async function sendEmployeeBookingNotification(
  meeting: Meeting,
  employee: Employee
): Promise<boolean> {
  const { date, time } = formatDateTime(meeting.start_at);
  
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #f8f5ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
        .info-row:last-child { border-bottom: none; }
        .label { color: #666; }
        .value { color: #333; font-weight: 500; }
        .btn { display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📅 اجتماع جديد</h1>
        </div>
        <div class="content">
          <p>مرحباً ${employee.name}،</p>
          <p>لديك اجتماع جديد تم حجزه.</p>
          
          <div class="info-box">
            <div class="info-row">
              <span class="label">الموضوع:</span>
              <span class="value">${meeting.subject}</span>
            </div>
            <div class="info-row">
              <span class="label">العميل:</span>
              <span class="value">${meeting.client_name}</span>
            </div>
            <div class="info-row">
              <span class="label">البريد:</span>
              <span class="value">${meeting.client_email}</span>
            </div>
            ${meeting.client_phone ? `
            <div class="info-row">
              <span class="label">الهاتف:</span>
              <span class="value">${meeting.client_phone}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="label">التاريخ:</span>
              <span class="value">${date}</span>
            </div>
            <div class="info-row">
              <span class="label">الوقت:</span>
              <span class="value">${time}</span>
            </div>
            <div class="info-row">
              <span class="label">المدة:</span>
              <span class="value">${meeting.duration_minutes} دقيقة</span>
            </div>
          </div>
          
          ${meeting.google_meet_link ? `
          <p style="text-align: center;">
            <a href="${meeting.google_meet_link}" class="btn">انضم للاجتماع</a>
          </p>
          ` : ''}
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(employee.email, `اجتماع جديد: ${meeting.subject} مع ${meeting.client_name}`, html);
}

/**
 * إرسال بريد إلغاء للعميل
 */
async function sendClientCancellationEmail(
  meeting: Meeting,
  employee: Employee,
  reason?: string
): Promise<boolean> {
  const { date, time } = formatDateTime(meeting.start_at);
  
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
        .header { background: #EF4444; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ تم إلغاء الاجتماع</h1>
        </div>
        <div class="content">
          <p>مرحباً ${meeting.client_name}،</p>
          <p>نأسف لإبلاغك بأن الاجتماع التالي قد تم إلغاؤه:</p>
          
          <div class="info-box">
            <p><strong>الموضوع:</strong> ${meeting.subject}</p>
            <p><strong>التاريخ:</strong> ${date}</p>
            <p><strong>الوقت:</strong> ${time}</p>
            ${reason ? `<p><strong>السبب:</strong> ${reason}</p>` : ''}
          </div>
          
          <p>نعتذر عن أي إزعاج. يمكنك حجز موعد جديد في أي وقت.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(meeting.client_email, `تم إلغاء الاجتماع: ${meeting.subject}`, html);
}

/**
 * إرسال بريد تذكير
 */
async function sendReminderEmail(
  meeting: Meeting,
  employee: Employee,
  isClient: boolean,
  minutesBefore: number
): Promise<boolean> {
  const { date, time } = formatDateTime(meeting.start_at);
  const recipientName = isClient ? meeting.client_name : employee.name;
  const recipientEmail = isClient ? meeting.client_email : employee.email;
  
  const timeText = minutesBefore >= 60 
    ? `${Math.round(minutesBefore / 60)} ساعة` 
    : `${minutesBefore} دقيقة`;
  
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #F59E0B, #EAB308); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #fffbeb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .btn { display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ تذكير باجتماع</h1>
        </div>
        <div class="content">
          <p>مرحباً ${recipientName}،</p>
          <p>هذا تذكير بأن لديك اجتماع خلال ${timeText}.</p>
          
          <div class="info-box">
            <p><strong>الموضوع:</strong> ${meeting.subject}</p>
            <p><strong>التاريخ:</strong> ${date}</p>
            <p><strong>الوقت:</strong> ${time}</p>
            <p><strong>المدة:</strong> ${meeting.duration_minutes} دقيقة</p>
          </div>
          
          ${meeting.google_meet_link ? `
          <p style="text-align: center;">
            <a href="${meeting.google_meet_link}" class="btn">انضم للاجتماع</a>
          </p>
          ` : ''}
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(recipientEmail, `تذكير: ${meeting.subject} خلال ${timeText}`, html);
}

// =====================================================
// MAIN NOTIFICATION FUNCTIONS
// =====================================================

/**
 * إرسال إشعارات عند إنشاء اجتماع
 */
export async function notifyMeetingCreated(
  meeting: Meeting,
  calendarLinks?: { google?: string; outlook?: string }
): Promise<void> {
  const employee = await getEmployee(meeting.employee_id);
  if (!employee) return;

  // إرسال بالتوازي
  await Promise.allSettled([
    sendSlackToEmployee(employee, meeting, 'created'),
    sendSlackToAdminChannel(employee, meeting, 'created'),
    sendClientBookingConfirmation(meeting, employee, calendarLinks || {}),
    sendEmployeeBookingNotification(meeting, employee),
  ]);
}

/**
 * إرسال إشعارات عند إلغاء اجتماع
 */
export async function notifyMeetingCancelled(
  meeting: Meeting,
  reason?: string
): Promise<void> {
  const employee = await getEmployee(meeting.employee_id);
  if (!employee) return;

  await Promise.allSettled([
    sendSlackToEmployee(employee, meeting, 'cancelled'),
    sendSlackToAdminChannel(employee, meeting, 'cancelled'),
    sendClientCancellationEmail(meeting, employee, reason),
  ]);
}

/**
 * إرسال إشعارات عند إعادة جدولة اجتماع
 */
export async function notifyMeetingRescheduled(
  meeting: Meeting,
  oldDateTime: string
): Promise<void> {
  const employee = await getEmployee(meeting.employee_id);
  if (!employee) return;

  await Promise.allSettled([
    sendSlackToEmployee(employee, meeting, 'rescheduled'),
    sendSlackToAdminChannel(employee, meeting, 'rescheduled'),
    // يمكن إضافة بريد إعادة الجدولة هنا
  ]);
}

/**
 * إرسال تذكير بالاجتماع
 */
export async function sendMeetingReminder(
  meeting: Meeting,
  minutesBefore: number
): Promise<void> {
  const employee = await getEmployee(meeting.employee_id);
  if (!employee) return;

  await Promise.allSettled([
    sendReminderEmail(meeting, employee, true, minutesBefore),  // للعميل
    sendReminderEmail(meeting, employee, false, minutesBefore), // للموظف
  ]);

  // تحديث حالة التذكير في قاعدة البيانات
  const supabase = getSupabase();
  const updateField = minutesBefore >= 60 ? 'reminder_24h_sent' : 'reminder_1h_sent';
  await supabase
    .from('meetings')
    .update({ [updateField]: true })
    .eq('id', meeting.id);
}

export {
  sendSlackToEmployee,
  sendSlackToAdminChannel,
  sendEmail,
  sendReminderEmail,
};
