-- =====================================================
-- جداول إدارة المستخدمين (يجب إنشاؤها أولاً)
-- =====================================================

-- Create admin_users table for admin authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'account_manager', -- super_admin, admin, team_leader, account_manager
  permissions JSONB DEFAULT '[]'::jsonb, -- ['manage_tasks', 'manage_stores', 'manage_users', 'manage_help', 'view_stats']
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_sessions table for token management
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Create indexes for admin tables
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON admin_sessions(user_id);

-- Enable RLS for admin tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for admin tables
CREATE POLICY "Allow all operations on admin_users" ON admin_users FOR ALL USING (true);
CREATE POLICY "Allow all operations on admin_sessions" ON admin_sessions FOR ALL USING (true);

-- Insert default super admin user (password: admin123)
-- Password hash is SHA-256 of 'admin123'
INSERT INTO admin_users (username, password_hash, name, role, permissions, is_active)
VALUES (
  'admin',
  '240be518fabd2724ddb6f04eeb9d5b0e5c8b8c5c0e0e0e0e0e0e0e0e0e0e0e0e',
  'سوبر أدمن',
  'super_admin',
  '["manage_tasks", "manage_stores", "manage_users", "manage_help", "view_stats", "manage_team"]'::jsonb,
  true
) ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- جداول المتاجر والمهام
-- =====================================================

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_name TEXT NOT NULL,                    -- اسم المتجر
  store_url TEXT UNIQUE NOT NULL,              -- رابط المتجر
  owner_name TEXT NOT NULL,                    -- صاحب المتجر
  owner_phone TEXT,                            -- رقم الجوال
  owner_email TEXT,                            -- البريد الإلكتروني
  owner_whatsapp TEXT,                         -- واتساب
  account_manager_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,  -- مدير الحساب المسؤول
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,          -- من أضاف المتجر
  notes TEXT,                                  -- ملاحظات
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

-- Create tasks_progress table
CREATE TABLE IF NOT EXISTS tasks_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  is_done BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, task_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_progress_store_id ON tasks_progress(store_id);
CREATE INDEX IF NOT EXISTS idx_tasks_progress_task_id ON tasks_progress(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_stores_url ON stores(store_url);
CREATE INDEX IF NOT EXISTS idx_stores_account_manager ON stores(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_stores_created_by ON stores(created_by);

-- Enable Row Level Security (optional, for future use)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks_progress ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since we're not using auth yet)
CREATE POLICY "Allow all operations on stores" ON stores FOR ALL USING (true);
CREATE POLICY "Allow all operations on tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all operations on tasks_progress" ON tasks_progress FOR ALL USING (true);

-- Create help_requests table for support system
CREATE TABLE IF NOT EXISTS help_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  reply TEXT,
  status TEXT DEFAULT 'pending', -- pending, replied, closed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  replied_at TIMESTAMP WITH TIME ZONE
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  type TEXT DEFAULT 'help_reply', -- help_reply, announcement, etc.
  help_request_id UUID REFERENCES help_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_help_requests_store_id ON help_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_status ON help_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_store_id ON notifications(store_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Enable RLS
ALTER TABLE help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on help_requests" ON help_requests FOR ALL USING (true);
CREATE POLICY "Allow all operations on notifications" ON notifications FOR ALL USING (true);

-- =====================================================
-- جداول إعدادات Slack
-- =====================================================

-- Create slack_webhooks table for Slack integration
CREATE TABLE IF NOT EXISTS slack_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- اسم القناة أو وصف
  webhook_url TEXT NOT NULL,
  channel_name TEXT, -- اسم القناة في Slack
  is_active BOOLEAN DEFAULT TRUE,
  notify_new_store BOOLEAN DEFAULT TRUE, -- إشعار عند تسجيل متجر جديد
  notify_store_complete BOOLEAN DEFAULT TRUE, -- إشعار عند إكمال متجر 100%
  notify_milestone BOOLEAN DEFAULT TRUE, -- إشعار عند وصول متجر لمرحلة (50%, 75%)
  notify_help_request BOOLEAN DEFAULT TRUE, -- إشعار عند طلب مساعدة جديد
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create slack_notifications_log table to track sent notifications
CREATE TABLE IF NOT EXISTS slack_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES slack_webhooks(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- new_store, store_complete, milestone, help_request
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'sent', -- sent, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_slack_webhooks_is_active ON slack_webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_slack_notifications_log_webhook_id ON slack_notifications_log(webhook_id);
CREATE INDEX IF NOT EXISTS idx_slack_notifications_log_type ON slack_notifications_log(notification_type);

-- Enable RLS
ALTER TABLE slack_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_notifications_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on slack_webhooks" ON slack_webhooks FOR ALL USING (true);
CREATE POLICY "Allow all operations on slack_notifications_log" ON slack_notifications_log FOR ALL USING (true);

-- =====================================================
-- جداول نظام الاجتماعات
-- =====================================================

-- 1) أنواع الاجتماعات
CREATE TABLE IF NOT EXISTS meeting_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  color TEXT DEFAULT '#8B5CF6',
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) إعدادات الاجتماعات لكل موظف
CREATE TABLE IF NOT EXISTS employee_meeting_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  booking_slug TEXT UNIQUE,
  is_accepting_meetings BOOLEAN DEFAULT TRUE,
  slot_duration INTEGER DEFAULT 30,
  buffer_before INTEGER DEFAULT 5,
  buffer_after INTEGER DEFAULT 5,
  max_meetings_per_day INTEGER DEFAULT 8,
  max_advance_days INTEGER DEFAULT 30,
  min_notice_hours INTEGER DEFAULT 24,
  working_hours JSONB DEFAULT '{}',
  welcome_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- 3) أوقات العمل للموظف
CREATE TABLE IF NOT EXISTS employee_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, day_of_week)
);

-- 4) الإجازات والأوقات المحجوبة
CREATE TABLE IF NOT EXISTS employee_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  type TEXT DEFAULT 'time_off',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5) حسابات Google OAuth
CREATE TABLE IF NOT EXISTS google_oauth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  google_email TEXT,
  google_id TEXT,
  refresh_token TEXT,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  calendar_id TEXT DEFAULT 'primary',
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- 6) الاجتماعات
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  meeting_type_id UUID REFERENCES meeting_types(id) ON DELETE SET NULL,
  
  -- بيانات العميل
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  client_company TEXT,
  
  -- تفاصيل الاجتماع
  subject TEXT NOT NULL,
  notes TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  timezone TEXT DEFAULT 'Asia/Riyadh',
  
  -- الحالة
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled')),
  
  -- Google Calendar
  google_event_id TEXT,
  google_meet_link TEXT,
  calendar_event_created BOOLEAN DEFAULT FALSE,
  
  -- Tokens للعميل
  confirmation_token TEXT,
  cancel_token TEXT,
  reschedule_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- إعادة الجدولة
  original_start_at TIMESTAMPTZ,
  rescheduled_at TIMESTAMPTZ,
  rescheduled_by TEXT,
  reschedule_count INTEGER DEFAULT 0,
  
  -- الإلغاء
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by TEXT,
  
  -- التذكيرات
  reminder_24h_sent BOOLEAN DEFAULT FALSE,
  reminder_1h_sent BOOLEAN DEFAULT FALSE,
  
  -- معلومات إضافية
  source TEXT DEFAULT 'booking_page',
  ip_address TEXT,
  user_agent TEXT,
  idempotency_key TEXT UNIQUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7) سجل الاجتماعات
CREATE TABLE IF NOT EXISTS meeting_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by TEXT,
  performed_by_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8) Rate Limiting
CREATE TABLE IF NOT EXISTS meeting_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL,
  action TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  window_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- فهارس نظام الاجتماعات
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_meeting_types_slug ON meeting_types(slug);
CREATE INDEX IF NOT EXISTS idx_meeting_types_active ON meeting_types(is_active);

CREATE INDEX IF NOT EXISTS idx_employee_settings_employee ON employee_meeting_settings(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_settings_slug ON employee_meeting_settings(booking_slug);

CREATE INDEX IF NOT EXISTS idx_employee_availability_employee ON employee_availability(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_availability_day ON employee_availability(day_of_week);

CREATE INDEX IF NOT EXISTS idx_employee_time_off_employee ON employee_time_off(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_time_off_dates ON employee_time_off(start_at, end_at);

CREATE INDEX IF NOT EXISTS idx_google_oauth_employee ON google_oauth_accounts(employee_id);

CREATE INDEX IF NOT EXISTS idx_meetings_employee ON meetings(employee_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_start_at ON meetings(start_at);
CREATE INDEX IF NOT EXISTS idx_meetings_client_email ON meetings(client_email);
CREATE INDEX IF NOT EXISTS idx_meetings_google_event ON meetings(google_event_id);
CREATE INDEX IF NOT EXISTS idx_meetings_confirmation_token ON meetings(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_meetings_upcoming ON meetings(status, start_at) WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_meeting_logs_meeting ON meeting_logs(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_logs_action ON meeting_logs(action);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON meeting_rate_limits(identifier, identifier_type, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON meeting_rate_limits(window_end);

-- =====================================================
-- تفعيل RLS لجداول الاجتماعات
-- =====================================================

ALTER TABLE meeting_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_meeting_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_oauth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_rate_limits ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- سياسات RLS لجداول الاجتماعات
-- =====================================================

CREATE POLICY "Allow all on meeting_types" ON meeting_types FOR ALL USING (true);
CREATE POLICY "Allow all on employee_meeting_settings" ON employee_meeting_settings FOR ALL USING (true);
CREATE POLICY "Allow all on employee_availability" ON employee_availability FOR ALL USING (true);
CREATE POLICY "Allow all on employee_time_off" ON employee_time_off FOR ALL USING (true);
CREATE POLICY "Allow all on google_oauth_accounts" ON google_oauth_accounts FOR ALL USING (true);
CREATE POLICY "Allow all on meetings" ON meetings FOR ALL USING (true);
CREATE POLICY "Allow all on meeting_logs" ON meeting_logs FOR ALL USING (true);
CREATE POLICY "Allow all on meeting_rate_limits" ON meeting_rate_limits FOR ALL USING (true);

-- =====================================================
-- جدول google_oauth_states لفصل فلو التقويم عن NextAuth
-- =====================================================

CREATE TABLE IF NOT EXISTS google_oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    state TEXT UNIQUE NOT NULL,
    code_verifier TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index للبحث السريع بالـ state
CREATE INDEX IF NOT EXISTS idx_google_oauth_states_state ON google_oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_google_oauth_states_expires ON google_oauth_states(expires_at);

-- RLS
ALTER TABLE google_oauth_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on google_oauth_states" ON google_oauth_states FOR ALL USING (true);

-- حذف الـ states المنتهية تلقائياً (يمكن تشغيله كـ cron job)
-- DELETE FROM google_oauth_states WHERE expires_at < NOW();

-- =====================================================
-- جدول user_integrations لتخزين tokens التقويم (منفصل عن NextAuth)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'google_calendar',
    access_token TEXT,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    scope TEXT,
    email TEXT,
    extra_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_provider ON user_integrations(user_id, provider);

-- RLS
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on user_integrations" ON user_integrations FOR ALL USING (true);

-- Trigger لتحديث updated_at
CREATE TRIGGER update_user_integrations_updated_at
    BEFORE UPDATE ON user_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Trigger لتحديث updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meeting_types_updated_at
    BEFORE UPDATE ON meeting_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_meeting_settings_updated_at
    BEFORE UPDATE ON employee_meeting_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_oauth_accounts_updated_at
    BEFORE UPDATE ON google_oauth_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- بيانات افتراضية لأنواع الاجتماعات
-- =====================================================

INSERT INTO meeting_types (name, slug, description, duration_minutes, color) VALUES
  ('استشارة سريعة', 'quick-consultation', 'استشارة سريعة لمدة 15 دقيقة', 15, '#10B981'),
  ('اجتماع عادي', 'standard-meeting', 'اجتماع عادي لمدة 30 دقيقة', 30, '#8B5CF6'),
  ('اجتماع مطول', 'extended-meeting', 'اجتماع مطول لمدة 60 دقيقة', 60, '#F59E0B')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- Analytics Functions للإحصائيات المتقدمة
-- =====================================================

-- 1) KPIs الرئيسية
CREATE OR REPLACE FUNCTION admin_meeting_kpis(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
BEGIN
    v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
    v_end_date := COALESCE(p_end_date, NOW());
    
    SELECT json_build_object(
        'total_meetings', (
            SELECT COUNT(*) FROM meetings 
            WHERE start_at BETWEEN v_start_date AND v_end_date
            AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        ),
        'by_status', (
            SELECT json_object_agg(status, cnt)
            FROM (
                SELECT status, COUNT(*) as cnt 
                FROM meetings 
                WHERE start_at BETWEEN v_start_date AND v_end_date
                AND (p_employee_id IS NULL OR employee_id = p_employee_id)
                GROUP BY status
            ) s
        ),
        'no_show_rate', (
            SELECT ROUND(
                COALESCE(
                    COUNT(*) FILTER (WHERE status = 'no_show')::NUMERIC / 
                    NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'no_show')), 0) * 100,
                    0
                ), 2
            )
            FROM meetings 
            WHERE start_at BETWEEN v_start_date AND v_end_date
            AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        ),
        'cancellation_rate', (
            SELECT ROUND(
                COALESCE(
                    COUNT(*) FILTER (WHERE status = 'cancelled')::NUMERIC / 
                    NULLIF(COUNT(*), 0) * 100,
                    0
                ), 2
            )
            FROM meetings 
            WHERE start_at BETWEEN v_start_date AND v_end_date
            AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        ),
        'avg_lead_time_hours', (
            SELECT ROUND(
                COALESCE(
                    AVG(EXTRACT(EPOCH FROM (start_at - created_at)) / 3600),
                    0
                ), 1
            )
            FROM meetings 
            WHERE start_at BETWEEN v_start_date AND v_end_date
            AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        ),
        'repeat_clients', (
            SELECT COUNT(DISTINCT client_email)
            FROM (
                SELECT client_email
                FROM meetings
                WHERE start_at BETWEEN v_start_date AND v_end_date
                AND (p_employee_id IS NULL OR employee_id = p_employee_id)
                GROUP BY client_email
                HAVING COUNT(*) > 1
            ) rc
        ),
        'unique_clients', (
            SELECT COUNT(DISTINCT client_email)
            FROM meetings 
            WHERE start_at BETWEEN v_start_date AND v_end_date
            AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        ),
        'today_meetings', (
            SELECT COUNT(*) FROM meetings 
            WHERE DATE(start_at) = CURRENT_DATE
            AND status = 'confirmed'
            AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        ),
        'upcoming_meetings', (
            SELECT COUNT(*) FROM meetings 
            WHERE start_at > NOW()
            AND status = 'confirmed'
            AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        ),
        'avg_duration_minutes', (
            SELECT ROUND(COALESCE(AVG(duration_minutes), 0), 0)
            FROM meetings 
            WHERE start_at BETWEEN v_start_date AND v_end_date
            AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) خريطة حرارية
CREATE OR REPLACE FUNCTION admin_meeting_heatmap(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
BEGIN
    v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
    v_end_date := COALESCE(p_end_date, NOW());
    
    SELECT json_build_object(
        'by_day', (
            SELECT json_agg(json_build_object(
                'day', day_of_week,
                'day_name', CASE day_of_week
                    WHEN 0 THEN 'الأحد'
                    WHEN 1 THEN 'الإثنين'
                    WHEN 2 THEN 'الثلاثاء'
                    WHEN 3 THEN 'الأربعاء'
                    WHEN 4 THEN 'الخميس'
                    WHEN 5 THEN 'الجمعة'
                    WHEN 6 THEN 'السبت'
                END,
                'count', cnt
            ) ORDER BY day_of_week)
            FROM (
                SELECT EXTRACT(DOW FROM start_at)::INT as day_of_week, COUNT(*) as cnt
                FROM meetings
                WHERE start_at BETWEEN v_start_date AND v_end_date
                AND (p_employee_id IS NULL OR employee_id = p_employee_id)
                GROUP BY EXTRACT(DOW FROM start_at)
            ) d
        ),
        'by_hour', (
            SELECT json_agg(json_build_object(
                'hour', hour_of_day,
                'count', cnt
            ) ORDER BY hour_of_day)
            FROM (
                SELECT EXTRACT(HOUR FROM start_at)::INT as hour_of_day, COUNT(*) as cnt
                FROM meetings
                WHERE start_at BETWEEN v_start_date AND v_end_date
                AND (p_employee_id IS NULL OR employee_id = p_employee_id)
                GROUP BY EXTRACT(HOUR FROM start_at)
            ) h
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) إحصائيات حسب الموظف
CREATE OR REPLACE FUNCTION admin_meeting_by_employee(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
BEGIN
    v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
    v_end_date := COALESCE(p_end_date, NOW());
    
    SELECT json_agg(json_build_object(
        'employee_id', e.id,
        'employee_name', e.name,
        'total', COALESCE(m.total, 0),
        'completed', COALESCE(m.completed, 0),
        'cancelled', COALESCE(m.cancelled, 0),
        'no_show', COALESCE(m.no_show, 0),
        'completion_rate', ROUND(
            COALESCE(m.completed::NUMERIC / NULLIF(m.total, 0) * 100, 0), 1
        ),
        'no_show_rate', ROUND(
            COALESCE(m.no_show::NUMERIC / NULLIF(m.completed + m.no_show, 0) * 100, 0), 1
        )
    ) ORDER BY COALESCE(m.total, 0) DESC)
    FROM admin_users e
    LEFT JOIN (
        SELECT 
            employee_id,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
            COUNT(*) FILTER (WHERE status = 'no_show') as no_show
        FROM meetings
        WHERE start_at BETWEEN v_start_date AND v_end_date
        GROUP BY employee_id
    ) m ON e.id = m.employee_id
    WHERE e.role IN ('admin', 'super_admin', 'employee', 'account_manager')
    INTO v_result;
    
    RETURN COALESCE(v_result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) جلب جميع الإحصائيات
CREATE OR REPLACE FUNCTION admin_meeting_analytics_full(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
    RETURN json_build_object(
        'kpis', admin_meeting_kpis(p_start_date, p_end_date, p_employee_id),
        'heatmap', admin_meeting_heatmap(p_start_date, p_end_date, p_employee_id),
        'by_employee', admin_meeting_by_employee(p_start_date, p_end_date)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
