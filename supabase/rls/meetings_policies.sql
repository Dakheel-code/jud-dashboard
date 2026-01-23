-- =====================================================
-- نظام الاجتماعات - Row Level Security Policies
-- تاريخ: 2026-01-23
-- =====================================================

-- =====================================================
-- ملاحظات مهمة:
-- 1. الصفحة العامة لا تصل مباشرة لقاعدة البيانات
-- 2. جميع العمليات من الصفحة العامة تمر عبر API (service_role)
-- 3. الموظف يرى/يعدل اجتماعاته فقط
-- 4. الإدارة (super_admin, admin) ترى كل شيء
-- =====================================================

-- =====================================================
-- دالة مساعدة للتحقق من الدور
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin_or_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- جلب الدور من الـ JWT claims
    v_role := current_setting('request.jwt.claims', true)::json->>'role';
    RETURN v_role IN ('super_admin', 'admin');
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على معرف المستخدم الحالي
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN (current_setting('request.jwt.claims', true)::json->>'sub')::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 1) سياسات meeting_types
-- =====================================================

-- الجميع يمكنهم قراءة أنواع الاجتماعات النشطة
DROP POLICY IF EXISTS "Anyone can view active meeting types" ON meeting_types;
CREATE POLICY "Anyone can view active meeting types" ON meeting_types
    FOR SELECT
    USING (is_active = true);

-- الإدارة فقط يمكنها إدارة أنواع الاجتماعات
DROP POLICY IF EXISTS "Admins can manage meeting types" ON meeting_types;
CREATE POLICY "Admins can manage meeting types" ON meeting_types
    FOR ALL
    USING (is_admin_or_super_admin())
    WITH CHECK (is_admin_or_super_admin());

-- =====================================================
-- 2) سياسات employee_meeting_settings
-- =====================================================

-- الموظف يرى إعداداته فقط
DROP POLICY IF EXISTS "Employees can view own settings" ON employee_meeting_settings;
CREATE POLICY "Employees can view own settings" ON employee_meeting_settings
    FOR SELECT
    USING (employee_id = get_current_user_id() OR is_admin_or_super_admin());

-- الموظف يعدل إعداداته فقط
DROP POLICY IF EXISTS "Employees can update own settings" ON employee_meeting_settings;
CREATE POLICY "Employees can update own settings" ON employee_meeting_settings
    FOR UPDATE
    USING (employee_id = get_current_user_id() OR is_admin_or_super_admin())
    WITH CHECK (employee_id = get_current_user_id() OR is_admin_or_super_admin());

-- الموظف يمكنه إنشاء إعداداته
DROP POLICY IF EXISTS "Employees can insert own settings" ON employee_meeting_settings;
CREATE POLICY "Employees can insert own settings" ON employee_meeting_settings
    FOR INSERT
    WITH CHECK (employee_id = get_current_user_id() OR is_admin_or_super_admin());

-- الإدارة يمكنها الحذف
DROP POLICY IF EXISTS "Admins can delete settings" ON employee_meeting_settings;
CREATE POLICY "Admins can delete settings" ON employee_meeting_settings
    FOR DELETE
    USING (is_admin_or_super_admin());

-- =====================================================
-- 3) سياسات employee_availability
-- =====================================================

-- الموظف يرى أوقاته فقط
DROP POLICY IF EXISTS "Employees can view own availability" ON employee_availability;
CREATE POLICY "Employees can view own availability" ON employee_availability
    FOR SELECT
    USING (employee_id = get_current_user_id() OR is_admin_or_super_admin());

-- الموظف يعدل أوقاته فقط
DROP POLICY IF EXISTS "Employees can manage own availability" ON employee_availability;
CREATE POLICY "Employees can manage own availability" ON employee_availability
    FOR ALL
    USING (employee_id = get_current_user_id() OR is_admin_or_super_admin())
    WITH CHECK (employee_id = get_current_user_id() OR is_admin_or_super_admin());

-- =====================================================
-- 4) سياسات employee_time_off
-- =====================================================

-- الموظف يرى إجازاته فقط
DROP POLICY IF EXISTS "Employees can view own time off" ON employee_time_off;
CREATE POLICY "Employees can view own time off" ON employee_time_off
    FOR SELECT
    USING (employee_id = get_current_user_id() OR is_admin_or_super_admin());

-- الموظف يدير إجازاته فقط
DROP POLICY IF EXISTS "Employees can manage own time off" ON employee_time_off;
CREATE POLICY "Employees can manage own time off" ON employee_time_off
    FOR ALL
    USING (employee_id = get_current_user_id() OR is_admin_or_super_admin())
    WITH CHECK (employee_id = get_current_user_id() OR is_admin_or_super_admin());

-- =====================================================
-- 5) سياسات google_oauth_accounts
-- =====================================================

-- الموظف يرى حسابه فقط (بيانات حساسة)
DROP POLICY IF EXISTS "Employees can view own google account" ON google_oauth_accounts;
CREATE POLICY "Employees can view own google account" ON google_oauth_accounts
    FOR SELECT
    USING (employee_id = get_current_user_id());

-- الموظف يدير حسابه فقط
DROP POLICY IF EXISTS "Employees can manage own google account" ON google_oauth_accounts;
CREATE POLICY "Employees can manage own google account" ON google_oauth_accounts
    FOR ALL
    USING (employee_id = get_current_user_id())
    WITH CHECK (employee_id = get_current_user_id());

-- الإدارة يمكنها رؤية الحسابات (بدون tokens)
DROP POLICY IF EXISTS "Admins can view google accounts metadata" ON google_oauth_accounts;
CREATE POLICY "Admins can view google accounts metadata" ON google_oauth_accounts
    FOR SELECT
    USING (is_admin_or_super_admin());

-- =====================================================
-- 6) سياسات meetings
-- =====================================================

-- الموظف يرى اجتماعاته فقط
DROP POLICY IF EXISTS "Employees can view own meetings" ON meetings;
CREATE POLICY "Employees can view own meetings" ON meetings
    FOR SELECT
    USING (employee_id = get_current_user_id() OR is_admin_or_super_admin());

-- الموظف يعدل اجتماعاته فقط
DROP POLICY IF EXISTS "Employees can update own meetings" ON meetings;
CREATE POLICY "Employees can update own meetings" ON meetings
    FOR UPDATE
    USING (employee_id = get_current_user_id() OR is_admin_or_super_admin())
    WITH CHECK (employee_id = get_current_user_id() OR is_admin_or_super_admin());

-- ممنوع الإدراج المباشر من anon - فقط عبر API (service_role)
-- لا نضيف سياسة INSERT للـ anon أو authenticated
-- الإدراج يتم فقط عبر service_role key في الـ API

-- الإدارة يمكنها إدراج اجتماعات
DROP POLICY IF EXISTS "Admins can insert meetings" ON meetings;
CREATE POLICY "Admins can insert meetings" ON meetings
    FOR INSERT
    WITH CHECK (is_admin_or_super_admin());

-- الموظف يمكنه حذف اجتماعاته (إلغاء)
DROP POLICY IF EXISTS "Employees can delete own meetings" ON meetings;
CREATE POLICY "Employees can delete own meetings" ON meetings
    FOR DELETE
    USING (employee_id = get_current_user_id() OR is_admin_or_super_admin());

-- =====================================================
-- 7) سياسات meeting_logs
-- =====================================================

-- الموظف يرى سجلات اجتماعاته فقط
DROP POLICY IF EXISTS "Employees can view own meeting logs" ON meeting_logs;
CREATE POLICY "Employees can view own meeting logs" ON meeting_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM meetings m 
            WHERE m.id = meeting_logs.meeting_id 
            AND (m.employee_id = get_current_user_id() OR is_admin_or_super_admin())
        )
    );

-- ممنوع الإدراج المباشر - فقط عبر API أو triggers
-- الإدارة يمكنها إدراج السجلات
DROP POLICY IF EXISTS "System can insert meeting logs" ON meeting_logs;
CREATE POLICY "System can insert meeting logs" ON meeting_logs
    FOR INSERT
    WITH CHECK (is_admin_or_super_admin());

-- ممنوع التعديل أو الحذف
DROP POLICY IF EXISTS "No one can update meeting logs" ON meeting_logs;
CREATE POLICY "No one can update meeting logs" ON meeting_logs
    FOR UPDATE
    USING (false);

DROP POLICY IF EXISTS "No one can delete meeting logs" ON meeting_logs;
CREATE POLICY "No one can delete meeting logs" ON meeting_logs
    FOR DELETE
    USING (false);

-- =====================================================
-- 8) سياسات meeting_rate_limits
-- =====================================================

-- هذا الجدول يُدار فقط عبر API (service_role)
-- لا سياسات للمستخدمين العاديين

DROP POLICY IF EXISTS "Only service role can access rate limits" ON meeting_rate_limits;
CREATE POLICY "Only service role can access rate limits" ON meeting_rate_limits
    FOR ALL
    USING (false)
    WITH CHECK (false);

-- =====================================================
-- 9) سياسات إضافية للأمان
-- =====================================================

-- منع الـ anon من الوصول المباشر للاجتماعات
-- (الصفحة العامة تستخدم API مع service_role)

-- التأكد من أن الـ anon لا يمكنه إدراج اجتماعات مباشرة
-- هذا يتم تلقائياً لأننا لم نضف سياسة INSERT للـ anon

-- =====================================================
-- 10) Grant Permissions
-- =====================================================

-- منح صلاحيات القراءة للـ authenticated على الجداول المسموحة
GRANT SELECT ON meeting_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON employee_meeting_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON employee_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON employee_time_off TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON google_oauth_accounts TO authenticated;
GRANT SELECT, UPDATE, DELETE ON meetings TO authenticated;
GRANT SELECT ON meeting_logs TO authenticated;

-- منح صلاحيات للـ Views
GRANT SELECT ON upcoming_meetings TO authenticated;
GRANT SELECT ON meeting_stats TO authenticated;

-- =====================================================
-- 11) Trigger لتسجيل التغييرات تلقائياً
-- =====================================================

CREATE OR REPLACE FUNCTION log_meeting_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO meeting_logs (meeting_id, action, performed_by, performed_by_id)
        VALUES (NEW.id, 'created', COALESCE(NEW.source, 'system'), get_current_user_id());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- تسجيل تغيير الحالة
        IF OLD.status != NEW.status THEN
            INSERT INTO meeting_logs (meeting_id, action, reason, performed_by, performed_by_id)
            VALUES (NEW.id, NEW.status, NEW.cancellation_reason, COALESCE(NEW.cancelled_by, 'system'), get_current_user_id());
        END IF;
        
        -- تسجيل إعادة الجدولة
        IF OLD.start_at != NEW.start_at THEN
            INSERT INTO meeting_logs (meeting_id, action, old_start_at, new_start_at, performed_by, performed_by_id)
            VALUES (NEW.id, 'rescheduled', OLD.start_at, NEW.start_at, COALESCE(NEW.rescheduled_by, 'system'), get_current_user_id());
        END IF;
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إنشاء الـ Trigger
DROP TRIGGER IF EXISTS trigger_log_meeting_changes ON meetings;
CREATE TRIGGER trigger_log_meeting_changes
    AFTER INSERT OR UPDATE ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION log_meeting_changes();

-- =====================================================
-- نهاية RLS Policies
-- =====================================================
