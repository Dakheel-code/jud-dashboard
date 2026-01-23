-- =====================================================
-- نظام الاجتماعات - Migration
-- تاريخ: 2026-01-23
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
    
    -- معلومات النوع
    name TEXT NOT NULL,                          -- اسم النوع (مثل: استشارة، متابعة، عرض تقديمي)
    slug TEXT UNIQUE NOT NULL,                   -- معرف فريد للـ URL
    description TEXT,                            -- وصف النوع
    
    -- إعدادات المدة
    duration_minutes INTEGER NOT NULL DEFAULT 30, -- المدة الافتراضية (30 أو 60)
    
    -- إعدادات الحجز
    buffer_before INTEGER DEFAULT 0,             -- وقت فاصل قبل الاجتماع (دقائق)
    buffer_after INTEGER DEFAULT 0,              -- وقت فاصل بعد الاجتماع (دقائق)
    
    -- الألوان والأيقونات
    color TEXT DEFAULT '#8B5CF6',                -- لون العرض
    icon TEXT,                                   -- أيقونة (اختياري)
    
    -- الحالة
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger لتحديث updated_at
CREATE TRIGGER update_meeting_types_updated_at
    BEFORE UPDATE ON meeting_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- إدخال أنواع افتراضية
INSERT INTO meeting_types (name, slug, description, duration_minutes, color) VALUES
    ('استشارة', 'consultation', 'جلسة استشارية عامة', 30, '#8B5CF6'),
    ('متابعة', 'follow-up', 'جلسة متابعة للمشاريع', 30, '#10B981'),
    ('عرض تقديمي', 'presentation', 'عرض تقديمي أو ديمو', 60, '#F59E0B'),
    ('اجتماع فريق', 'team-meeting', 'اجتماع داخلي للفريق', 60, '#3B82F6')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- 3) جدول إعدادات الموظف للاجتماعات (employee_meeting_settings)
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_meeting_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID UNIQUE NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    
    -- رابط الحجز
    booking_slug TEXT UNIQUE,                    -- رابط فريد للموظف (مثل: /book/ahmed)
    
    -- إعدادات عامة
    slot_duration INTEGER DEFAULT 30,            -- مدة الفترة الافتراضية (30 أو 60)
    buffer_before INTEGER DEFAULT 15,            -- وقت فاصل قبل الاجتماع (دقائق)
    buffer_after INTEGER DEFAULT 15,             -- وقت فاصل بعد الاجتماع (دقائق)
    
    -- حدود الحجز
    max_advance_days INTEGER DEFAULT 30,         -- أقصى عدد أيام للحجز المسبق
    min_notice_hours INTEGER DEFAULT 24,         -- أقل وقت إشعار مطلوب (ساعات)
    max_meetings_per_day INTEGER DEFAULT 10,     -- أقصى عدد اجتماعات في اليوم
    
    -- الحالة
    is_accepting_meetings BOOLEAN DEFAULT true,  -- هل يقبل اجتماعات؟
    
    -- رسالة ترحيب
    welcome_message TEXT,                        -- رسالة تظهر في صفحة الحجز
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger لتحديث updated_at
CREATE TRIGGER update_employee_meeting_settings_updated_at
    BEFORE UPDATE ON employee_meeting_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index للبحث بالـ slug
CREATE INDEX IF NOT EXISTS idx_employee_meeting_settings_slug ON employee_meeting_settings(booking_slug);

-- =====================================================
-- 4) جدول أوقات العمل (employee_availability)
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    
    -- اليوم (0 = الأحد، 6 = السبت)
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    
    -- أوقات العمل
    start_time TIME NOT NULL,                    -- وقت البداية (مثل: 09:00)
    end_time TIME NOT NULL,                      -- وقت النهاية (مثل: 17:00)
    
    -- الحالة
    is_enabled BOOLEAN DEFAULT true,             -- هل هذا اليوم متاح؟
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: لا يمكن تكرار نفس اليوم لنفس الموظف
    UNIQUE(employee_id, day_of_week),
    
    -- Constraint: وقت النهاية بعد وقت البداية
    CHECK (end_time > start_time)
);

-- Trigger لتحديث updated_at
CREATE TRIGGER update_employee_availability_updated_at
    BEFORE UPDATE ON employee_availability
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_employee_availability_lookup 
    ON employee_availability(employee_id, day_of_week);

-- =====================================================
-- 5) جدول الإجازات والأوقات المحجوبة (employee_time_off)
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_time_off (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    
    -- نوع الحجب
    type TEXT NOT NULL DEFAULT 'time_off',       -- time_off, busy, personal
    
    -- الفترة
    start_at TIMESTAMPTZ NOT NULL,               -- بداية الحجب
    end_at TIMESTAMPTZ NOT NULL,                 -- نهاية الحجب
    
    -- التفاصيل
    title TEXT,                                  -- عنوان (مثل: إجازة سنوية)
    reason TEXT,                                 -- السبب (اختياري)
    
    -- هل يتكرر؟
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT,                        -- قاعدة التكرار (iCal RRULE)
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: وقت النهاية بعد وقت البداية
    CHECK (end_at > start_at)
);

-- Trigger لتحديث updated_at
CREATE TRIGGER update_employee_time_off_updated_at
    BEFORE UPDATE ON employee_time_off
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Index للبحث بالتاريخ
CREATE INDEX IF NOT EXISTS idx_employee_time_off_dates 
    ON employee_time_off(employee_id, start_at, end_at);

-- =====================================================
-- 6) جدول حسابات Google OAuth (google_oauth_accounts)
-- =====================================================

CREATE TABLE IF NOT EXISTS google_oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID UNIQUE NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    
    -- بيانات Google
    google_email TEXT NOT NULL,                  -- البريد الإلكتروني في Google
    google_id TEXT,                              -- معرف Google الفريد
    
    -- Tokens (مشفرة)
    access_token TEXT,                           -- Access Token (مشفر)
    refresh_token TEXT,                          -- Refresh Token (مشفر)
    token_expires_at TIMESTAMPTZ,                -- وقت انتهاء الـ Access Token
    
    -- Calendar
    calendar_id TEXT,                            -- معرف التقويم المرتبط
    calendar_name TEXT,                          -- اسم التقويم
    
    -- حالة المزامنة
    sync_enabled BOOLEAN DEFAULT true,           -- هل المزامنة مفعلة؟
    last_sync_at TIMESTAMPTZ,                    -- آخر مزامنة
    sync_error TEXT,                             -- آخر خطأ في المزامنة
    
    -- Webhook
    webhook_channel_id TEXT,                     -- معرف قناة الـ webhook
    webhook_resource_id TEXT,                    -- معرف المورد
    webhook_expires_at TIMESTAMPTZ,              -- وقت انتهاء الـ webhook
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger لتحديث updated_at
CREATE TRIGGER update_google_oauth_accounts_updated_at
    BEFORE UPDATE ON google_oauth_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7) جدول الاجتماعات الرئيسي (meetings)
-- =====================================================

CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- العلاقات
    employee_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    meeting_type_id UUID REFERENCES meeting_types(id) ON DELETE SET NULL,
    
    -- بيانات العميل
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,
    client_company TEXT,                         -- اسم الشركة (اختياري)
    
    -- تفاصيل الاجتماع
    subject TEXT NOT NULL,
    notes TEXT,
    
    -- التوقيت
    start_at TIMESTAMPTZ NOT NULL,               -- وقت البداية
    end_at TIMESTAMPTZ NOT NULL,                 -- وقت النهاية
    duration_minutes INTEGER NOT NULL,           -- المدة بالدقائق
    timezone TEXT DEFAULT 'Asia/Riyadh',         -- المنطقة الزمنية
    
    -- الحالة
    status TEXT NOT NULL DEFAULT 'confirmed',    -- confirmed, cancelled, completed, no_show, rescheduled
    
    -- Google Calendar
    google_event_id TEXT,                        -- معرف الحدث في Google
    google_calendar_id TEXT,                     -- معرف التقويم
    google_meet_link TEXT,                       -- رابط Google Meet
    
    -- Tokens للعميل
    confirmation_token TEXT UNIQUE,              -- Token للتأكيد
    cancel_token TEXT UNIQUE,                    -- Token للإلغاء
    reschedule_token TEXT UNIQUE,                -- Token لإعادة الجدولة
    token_expires_at TIMESTAMPTZ,                -- وقت انتهاء الـ tokens
    
    -- إعادة الجدولة
    reschedule_count INTEGER DEFAULT 0,          -- عدد مرات إعادة الجدولة
    original_start_at TIMESTAMPTZ,               -- الوقت الأصلي (قبل إعادة الجدولة)
    rescheduled_at TIMESTAMPTZ,                  -- وقت آخر إعادة جدولة
    rescheduled_by TEXT,                         -- من قام بإعادة الجدولة (client/employee)
    
    -- الإلغاء
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancelled_by TEXT,                           -- client, employee, system
    
    -- التذكيرات
    reminder_24h_sent BOOLEAN DEFAULT false,     -- هل أُرسل تذكير 24 ساعة؟
    reminder_1h_sent BOOLEAN DEFAULT false,      -- هل أُرسل تذكير 1 ساعة؟
    
    -- Metadata
    source TEXT DEFAULT 'booking_page',          -- booking_page, admin, api
    ip_address TEXT,                             -- IP العميل عند الحجز
    user_agent TEXT,                             -- User Agent عند الحجز
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (end_at > start_at),
    CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled')),
    CHECK (reschedule_count >= 0 AND reschedule_count <= 5)
);

-- Trigger لتحديث updated_at
CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes للبحث السريع
CREATE INDEX IF NOT EXISTS idx_meetings_employee_start 
    ON meetings(employee_id, start_at);

CREATE INDEX IF NOT EXISTS idx_meetings_status 
    ON meetings(status);

CREATE INDEX IF NOT EXISTS idx_meetings_client_email 
    ON meetings(client_email);

CREATE INDEX IF NOT EXISTS idx_meetings_google_event 
    ON meetings(google_event_id);

CREATE INDEX IF NOT EXISTS idx_meetings_tokens 
    ON meetings(confirmation_token, cancel_token, reschedule_token);

CREATE INDEX IF NOT EXISTS idx_meetings_upcoming 
    ON meetings(employee_id, start_at) 
    WHERE status = 'confirmed' AND start_at > NOW();

-- =====================================================
-- 8) جدول سجل الاجتماعات (meeting_logs)
-- =====================================================

CREATE TABLE IF NOT EXISTS meeting_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    
    -- نوع الإجراء
    action TEXT NOT NULL,                        -- created, rescheduled, cancelled, completed, no_show, reminder_sent
    
    -- التفاصيل
    old_start_at TIMESTAMPTZ,                    -- الوقت القديم (للإعادة الجدولة)
    new_start_at TIMESTAMPTZ,                    -- الوقت الجديد
    reason TEXT,                                 -- السبب
    
    -- من قام بالإجراء
    performed_by TEXT NOT NULL,                  -- client, employee, system
    performed_by_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    
    -- Metadata
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB,                              -- بيانات إضافية
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index للبحث بالاجتماع
CREATE INDEX IF NOT EXISTS idx_meeting_logs_meeting 
    ON meeting_logs(meeting_id, created_at DESC);

-- =====================================================
-- 9) جدول Rate Limiting للحجوزات
-- =====================================================

CREATE TABLE IF NOT EXISTS meeting_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- معرفات
    ip_address TEXT NOT NULL,
    fingerprint TEXT,                            -- Browser fingerprint
    
    -- العدادات
    request_count INTEGER DEFAULT 1,
    
    -- النافذة الزمنية
    window_start TIMESTAMPTZ DEFAULT NOW(),
    window_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint: فريد لكل IP في كل نافذة
    UNIQUE(ip_address, window_start)
);

-- Index للبحث السريع
CREATE INDEX IF NOT EXISTS idx_meeting_rate_limits_ip 
    ON meeting_rate_limits(ip_address, window_end);

-- دالة لتنظيف السجلات القديمة
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM meeting_rate_limits WHERE window_end < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10) Views مفيدة
-- =====================================================

-- View للاجتماعات القادمة
CREATE OR REPLACE VIEW upcoming_meetings AS
SELECT 
    m.*,
    e.name as employee_name,
    e.email as employee_email,
    mt.name as meeting_type_name,
    mt.color as meeting_type_color
FROM meetings m
LEFT JOIN admin_users e ON m.employee_id = e.id
LEFT JOIN meeting_types mt ON m.meeting_type_id = mt.id
WHERE m.status = 'confirmed' 
  AND m.start_at > NOW()
ORDER BY m.start_at ASC;

-- View لإحصائيات الاجتماعات
CREATE OR REPLACE VIEW meeting_stats AS
SELECT 
    employee_id,
    COUNT(*) FILTER (WHERE status = 'confirmed' AND start_at > NOW()) as upcoming_count,
    COUNT(*) FILTER (WHERE status = 'confirmed' AND DATE(start_at) = CURRENT_DATE) as today_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
    COUNT(*) FILTER (WHERE status = 'no_show') as no_show_count,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as this_week_count,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as this_month_count
FROM meetings
GROUP BY employee_id;

-- =====================================================
-- 11) Functions مساعدة
-- =====================================================

-- دالة للتحقق من توفر وقت معين
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
    -- التحقق من عدم وجود اجتماع متعارض
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
    
    -- التحقق من عدم وجود إجازة
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

-- دالة لإنشاء token آمن
CREATE OR REPLACE FUNCTION generate_meeting_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12) تفعيل RLS على جميع الجداول
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
-- نهاية Migration
-- =====================================================
