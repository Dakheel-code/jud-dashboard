-- =====================================================
-- نظام الاجتماعات - Migration الكامل
-- تاريخ: 2026-01-23
-- يشمل: الجداول + الفهارس + RLS Policies
-- =====================================================

-- =====================================================
-- 1) TRIGGER FUNCTION لتحديث updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2) جدول أنواع الاجتماعات (meeting_types)
-- =====================================================

CREATE TABLE IF NOT EXISTS meeting_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    buffer_before INTEGER DEFAULT 0,
    buffer_after INTEGER DEFAULT 0,
    color TEXT DEFAULT '#8B5CF6',
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_meeting_types_updated_at ON meeting_types;
CREATE TRIGGER update_meeting_types_updated_at
    BEFORE UPDATE ON meeting_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

INSERT INTO meeting_types (name, slug, description, duration_minutes, color) VALUES
    ('استشارة', 'consultation', 'جلسة استشارية عامة', 30, '#8B5CF6'),
    ('متابعة', 'follow-up', 'جلسة متابعة للمشاريع', 30, '#10B981'),
    ('عرض تقديمي', 'presentation', 'عرض تقديمي أو ديمو', 60, '#F59E0B'),
    ('اجتماع فريق', 'team-meeting', 'اجتماع داخلي للفريق', 60, '#3B82F6')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 3) جدول إعدادات الموظف للاجتماعات
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_meeting_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID UNIQUE NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    booking_slug TEXT UNIQUE,
    slot_duration INTEGER DEFAULT 30,
    buffer_before INTEGER DEFAULT 15,
    buffer_after INTEGER DEFAULT 15,
    max_advance_days INTEGER DEFAULT 30,
    min_notice_hours INTEGER DEFAULT 24,
    max_meetings_per_day INTEGER DEFAULT 10,
    is_accepting_meetings BOOLEAN DEFAULT true,
    welcome_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_employee_meeting_settings_updated_at ON employee_meeting_settings;
CREATE TRIGGER update_employee_meeting_settings_updated_at
    BEFORE UPDATE ON employee_meeting_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_employee_meeting_settings_slug ON employee_meeting_settings(booking_slug);

-- =====================================================
-- 4) جدول أوقات العمل (employee_availability)
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, day_of_week),
    CHECK (end_time > start_time)
);

DROP TRIGGER IF EXISTS update_employee_availability_updated_at ON employee_availability;
CREATE TRIGGER update_employee_availability_updated_at
    BEFORE UPDATE ON employee_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_employee_availability_lookup 
    ON employee_availability(employee_id, day_of_week);

-- =====================================================
-- 5) جدول الإجازات (employee_time_off)
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_time_off (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'time_off',
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    title TEXT,
    reason TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_at > start_at)
);

DROP TRIGGER IF EXISTS update_employee_time_off_updated_at ON employee_time_off;
CREATE TRIGGER update_employee_time_off_updated_at
    BEFORE UPDATE ON employee_time_off
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_employee_time_off_dates 
    ON employee_time_off(employee_id, start_at, end_at);

-- =====================================================
-- 6) جدول حسابات Google OAuth
-- =====================================================

CREATE TABLE IF NOT EXISTS google_oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID UNIQUE NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    google_email TEXT NOT NULL,
    google_id TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    calendar_id TEXT,
    calendar_name TEXT,
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    sync_error TEXT,
    webhook_channel_id TEXT,
    webhook_resource_id TEXT,
    webhook_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_google_oauth_accounts_updated_at ON google_oauth_accounts;
CREATE TRIGGER update_google_oauth_accounts_updated_at
    BEFORE UPDATE ON google_oauth_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7) جدول الاجتماعات الرئيسي (meetings)
-- =====================================================

CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    meeting_type_id UUID REFERENCES meeting_types(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    client_company TEXT,
    subject TEXT NOT NULL,
    notes TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    timezone TEXT DEFAULT 'Asia/Riyadh',
    status TEXT NOT NULL DEFAULT 'confirmed',
    google_event_id TEXT,
    google_calendar_id TEXT,
    google_meet_link TEXT,
    confirmation_token TEXT UNIQUE,
    cancel_token TEXT UNIQUE,
    reschedule_token TEXT UNIQUE,
    token_expires_at TIMESTAMPTZ,
    reschedule_count INTEGER DEFAULT 0,
    original_start_at TIMESTAMPTZ,
    rescheduled_at TIMESTAMPTZ,
    rescheduled_by TEXT,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancelled_by TEXT,
    reminder_24h_sent BOOLEAN DEFAULT false,
    reminder_1h_sent BOOLEAN DEFAULT false,
    source TEXT DEFAULT 'booking_page',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (end_at > start_at),
    CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled')),
    CHECK (reschedule_count >= 0 AND reschedule_count <= 5)
);

DROP TRIGGER IF EXISTS update_meetings_updated_at ON meetings;
CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes للبحث السريع
CREATE INDEX IF NOT EXISTS idx_meetings_employee_start ON meetings(employee_id, start_at);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_client_email ON meetings(client_email);
CREATE INDEX IF NOT EXISTS idx_meetings_google_event ON meetings(google_event_id);
CREATE INDEX IF NOT EXISTS idx_meetings_tokens ON meetings(confirmation_token, cancel_token, reschedule_token);
-- ملاحظة: لا يمكن استخدام NOW() في partial index لأنها ليست IMMUTABLE
-- سنستخدم index عادي بدلاً من ذلك
CREATE INDEX IF NOT EXISTS idx_meetings_upcoming ON meetings(employee_id, start_at) WHERE status = 'confirmed';

-- =====================================================
-- 8) جدول سجل الاجتماعات (meeting_logs)
-- =====================================================

CREATE TABLE IF NOT EXISTS meeting_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    old_start_at TIMESTAMPTZ,
    new_start_at TIMESTAMPTZ,
    reason TEXT,
    performed_by TEXT NOT NULL,
    performed_by_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_logs_meeting ON meeting_logs(meeting_id, created_at DESC);

-- =====================================================
-- 9) جدول Rate Limiting
-- =====================================================

CREATE TABLE IF NOT EXISTS meeting_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    fingerprint TEXT,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    window_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ip_address, window_start)
);

CREATE INDEX IF NOT EXISTS idx_meeting_rate_limits_ip ON meeting_rate_limits(ip_address, window_end);

-- =====================================================
-- 10) Functions مساعدة
-- =====================================================

CREATE OR REPLACE FUNCTION is_slot_available(
    p_employee_id UUID,
    p_start_at TIMESTAMPTZ,
    p_end_at TIMESTAMPTZ,
    p_exclude_meeting_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_conflict_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_conflict_count
    FROM meetings
    WHERE employee_id = p_employee_id
      AND status IN ('confirmed', 'rescheduled')
      AND (id IS DISTINCT FROM p_exclude_meeting_id)
      AND (
          (start_at <= p_start_at AND end_at > p_start_at) OR
          (start_at < p_end_at AND end_at >= p_end_at) OR
          (start_at >= p_start_at AND end_at <= p_end_at)
      );
    
    IF v_conflict_count > 0 THEN
        RETURN FALSE;
    END IF;
    
    SELECT COUNT(*) INTO v_conflict_count
    FROM employee_time_off
    WHERE employee_id = p_employee_id
      AND (
          (start_at <= p_start_at AND end_at > p_start_at) OR
          (start_at < p_end_at AND end_at >= p_end_at) OR
          (start_at >= p_start_at AND end_at <= p_end_at)
      );
    
    RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_meeting_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11) تفعيل RLS
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
-- 12) RLS Policies - السماح بالكل مؤقتاً للـ API
-- =====================================================

-- meeting_types - الجميع يقرأ
DROP POLICY IF EXISTS "Allow read meeting_types" ON meeting_types;
CREATE POLICY "Allow read meeting_types" ON meeting_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all meeting_types for service" ON meeting_types;
CREATE POLICY "Allow all meeting_types for service" ON meeting_types FOR ALL USING (true);

-- employee_meeting_settings
DROP POLICY IF EXISTS "Allow all employee_meeting_settings" ON employee_meeting_settings;
CREATE POLICY "Allow all employee_meeting_settings" ON employee_meeting_settings FOR ALL USING (true);

-- employee_availability
DROP POLICY IF EXISTS "Allow all employee_availability" ON employee_availability;
CREATE POLICY "Allow all employee_availability" ON employee_availability FOR ALL USING (true);

-- employee_time_off
DROP POLICY IF EXISTS "Allow all employee_time_off" ON employee_time_off;
CREATE POLICY "Allow all employee_time_off" ON employee_time_off FOR ALL USING (true);

-- google_oauth_accounts
DROP POLICY IF EXISTS "Allow all google_oauth_accounts" ON google_oauth_accounts;
CREATE POLICY "Allow all google_oauth_accounts" ON google_oauth_accounts FOR ALL USING (true);

-- meetings
DROP POLICY IF EXISTS "Allow all meetings" ON meetings;
CREATE POLICY "Allow all meetings" ON meetings FOR ALL USING (true);

-- meeting_logs
DROP POLICY IF EXISTS "Allow all meeting_logs" ON meeting_logs;
CREATE POLICY "Allow all meeting_logs" ON meeting_logs FOR ALL USING (true);

-- meeting_rate_limits
DROP POLICY IF EXISTS "Allow all meeting_rate_limits" ON meeting_rate_limits;
CREATE POLICY "Allow all meeting_rate_limits" ON meeting_rate_limits FOR ALL USING (true);

-- =====================================================
-- نهاية Migration
-- =====================================================
