import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/notification-settings?user_id=xxx
export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get('user_id');
  if (!user_id) return NextResponse.json({ settings: getDefaults() });

  const { data } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', user_id)
    .single();

  if (!data) return NextResponse.json({ settings: getDefaults() });

  return NextResponse.json({ settings: data.settings || getDefaults() });
}

// POST /api/notification-settings
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { user_id, settings } = body;
  if (!user_id) return NextResponse.json({ error: 'user_id مطلوب' }, { status: 400 });

  const { error } = await supabase
    .from('notification_settings')
    .upsert({ user_id, settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

function getDefaults() {
  return {
    // المهام
    tasks_assigned: true,
    tasks_reassigned: true,
    tasks_completed: true,
    tasks_overdue: true,
    tasks_help_request: true,
    tasks_help_response: true,
    tasks_mention: true,
    tasks_comment: true,
    // التعاميم
    announcements_normal: true,
    announcements_urgent: true,
    announcements_scheduled: true,
    // الحضور
    attendance_checkin: true,
    attendance_checkout: true,
    attendance_leave_request: true,
    attendance_leave_approved: true,
    attendance_leave_rejected: true,
    // الفوترة
    billing_invoice_generated: true,
    billing_salary_generated: true,
    billing_payment_due: true,
    // المتاجر
    stores_new: true,
    stores_completed: true,
    stores_milestone: true,
    // النظام
    system_login: false,
    system_updates: true,
    system_errors: true,
    // قنوات التوصيل
    channel_inapp: true,
    channel_email: false,
    channel_slack: false,
    // الصوت والمظهر
    sound_enabled: true,
    sound_volume: 80,
    badge_enabled: true,
    popup_enabled: true,
    popup_duration: 5,
    // ساعات الهدوء
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    // التكرار
    digest_enabled: false,
    digest_frequency: 'daily',
  };
}
