/**
 * ReminderService - إدارة التذكيرات
 * 
 * يرسل تذكيرات:
 * - قبل 24 ساعة (اختياري)
 * - قبل 10 دقائق (أساسي)
 */

import { createClient } from '@supabase/supabase-js';
import { sendMeetingReminder } from './notification-service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

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
  reminder_24h_sent: boolean;
  reminder_1h_sent: boolean;
}

/**
 * جلب الاجتماعات التي تحتاج تذكير 24 ساعة
 */
async function getMeetingsFor24hReminder(): Promise<Meeting[]> {
  const supabase = getSupabase();
  const now = new Date();
  
  // الاجتماعات التي تبدأ خلال 24-25 ساعة ولم يُرسل لها تذكير
  const from = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 ساعة
  const to = new Date(now.getTime() + 25 * 60 * 60 * 1000);   // 25 ساعة

  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('status', 'confirmed')
    .eq('reminder_24h_sent', false)
    .gte('start_at', from.toISOString())
    .lte('start_at', to.toISOString());

  if (error) {
    console.error('Error fetching meetings for 24h reminder:', error);
    return [];
  }

  return data || [];
}

/**
 * جلب الاجتماعات التي تحتاج تذكير 10 دقائق
 */
async function getMeetingsFor10minReminder(): Promise<Meeting[]> {
  const supabase = getSupabase();
  const now = new Date();
  
  // الاجتماعات التي تبدأ خلال 8-12 دقيقة ولم يُرسل لها تذكير
  const from = new Date(now.getTime() + 8 * 60 * 1000);  // 8 دقائق
  const to = new Date(now.getTime() + 12 * 60 * 1000);   // 12 دقيقة

  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('status', 'confirmed')
    .eq('reminder_1h_sent', false)
    .gte('start_at', from.toISOString())
    .lte('start_at', to.toISOString());

  if (error) {
    console.error('Error fetching meetings for 10min reminder:', error);
    return [];
  }

  return data || [];
}

/**
 * معالجة تذكيرات 24 ساعة
 */
export async function process24hReminders(): Promise<{ processed: number; errors: number }> {
  const meetings = await getMeetingsFor24hReminder();
  let processed = 0;
  let errors = 0;

  for (const meeting of meetings) {
    try {
      await sendMeetingReminder(meeting, 24 * 60); // 24 ساعة = 1440 دقيقة
      processed++;
      console.log(`24h reminder sent for meeting ${meeting.id}`);
    } catch (error) {
      errors++;
      console.error(`Error sending 24h reminder for meeting ${meeting.id}:`, error);
    }
  }

  return { processed, errors };
}

/**
 * معالجة تذكيرات 10 دقائق
 */
export async function process10minReminders(): Promise<{ processed: number; errors: number }> {
  const meetings = await getMeetingsFor10minReminder();
  let processed = 0;
  let errors = 0;

  for (const meeting of meetings) {
    try {
      await sendMeetingReminder(meeting, 10);
      processed++;
      console.log(`10min reminder sent for meeting ${meeting.id}`);
    } catch (error) {
      errors++;
      console.error(`Error sending 10min reminder for meeting ${meeting.id}:`, error);
    }
  }

  return { processed, errors };
}

/**
 * معالجة جميع التذكيرات
 */
export async function processAllReminders(): Promise<{
  reminders_24h: { processed: number; errors: number };
  reminders_10min: { processed: number; errors: number };
}> {
  const [reminders_24h, reminders_10min] = await Promise.all([
    process24hReminders(),
    process10minReminders(),
  ]);

  return { reminders_24h, reminders_10min };
}

/**
 * تنظيف التذكيرات القديمة (اختياري)
 */
export async function cleanupOldReminders(): Promise<number> {
  const supabase = getSupabase();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // حذف سجلات rate limiting القديمة
  const { data } = await supabase
    .from('meeting_rate_limits')
    .delete()
    .lt('window_end', oneWeekAgo.toISOString())
    .select('id');

  return data?.length || 0;
}
