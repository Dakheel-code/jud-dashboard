-- =====================================================
-- نظام الاجتماعات - Analytics Functions
-- تاريخ: 2026-01-23
-- يشمل: RPC Functions للإحصائيات المتقدمة
-- =====================================================

-- =====================================================
-- 1) Function: admin_meeting_kpis
-- إحصائيات KPIs الرئيسية
-- =====================================================

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
    -- تحديد الفترة الافتراضية (آخر 30 يوم)
    v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
    v_end_date := COALESCE(p_end_date, NOW());
    
    SELECT json_build_object(
        -- إجمالي الاجتماعات
        'total_meetings', (
            SELECT COUNT(*) FROM meetings 
            WHERE start_at BETWEEN v_start_date AND v_end_date
            AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        ),
        
        -- حسب الحالة
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
        
        -- معدل عدم الحضور
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
        
        -- معدل الإلغاء
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
        
        -- متوسط وقت الحجز المسبق (بالساعات)
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
        
        -- العملاء المتكررون
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
        
        -- إجمالي العملاء الفريدين
        'unique_clients', (
            SELECT COUNT(DISTINCT client_email)
            FROM meetings 
            WHERE start_at BETWEEN v_start_date AND v_end_date
            AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        ),
        
        -- اجتماعات اليوم
        'today_meetings', (
            SELECT COUNT(*) FROM meetings 
            WHERE DATE(start_at) = CURRENT_DATE
            AND status = 'confirmed'
            AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        ),
        
        -- اجتماعات هذا الأسبوع
        'this_week_meetings', (
            SELECT COUNT(*) FROM meetings 
            WHERE start_at >= DATE_TRUNC('week', NOW())
            AND start_at < DATE_TRUNC('week', NOW()) + INTERVAL '1 week'
            AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        ),
        
        -- اجتماعات قادمة
        'upcoming_meetings', (
            SELECT COUNT(*) FROM meetings 
            WHERE start_at > NOW()
            AND status = 'confirmed'
            AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        ),
        
        -- متوسط مدة الاجتماع
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

-- =====================================================
-- 2) Function: admin_meeting_heatmap
-- خريطة حرارية للاجتماعات (يوم × ساعة)
-- =====================================================

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
        -- حسب اليوم
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
        
        -- حسب الساعة
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
        ),
        
        -- خريطة حرارية كاملة (يوم × ساعة)
        'heatmap', (
            SELECT json_agg(json_build_object(
                'day', day_of_week,
                'hour', hour_of_day,
                'count', cnt
            ))
            FROM (
                SELECT 
                    EXTRACT(DOW FROM start_at)::INT as day_of_week,
                    EXTRACT(HOUR FROM start_at)::INT as hour_of_day,
                    COUNT(*) as cnt
                FROM meetings
                WHERE start_at BETWEEN v_start_date AND v_end_date
                AND (p_employee_id IS NULL OR employee_id = p_employee_id)
                GROUP BY EXTRACT(DOW FROM start_at), EXTRACT(HOUR FROM start_at)
            ) hm
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3) Function: admin_meeting_by_employee
-- إحصائيات حسب الموظف
-- =====================================================

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
    WHERE e.role IN ('admin', 'super_admin', 'employee')
    INTO v_result;
    
    RETURN COALESCE(v_result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4) Function: admin_meeting_by_type
-- إحصائيات حسب نوع الاجتماع
-- =====================================================

CREATE OR REPLACE FUNCTION admin_meeting_by_type(
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
    
    SELECT json_agg(json_build_object(
        'type_id', mt.id,
        'type_name', mt.name,
        'type_slug', mt.slug,
        'color', mt.color,
        'duration', mt.duration_minutes,
        'total', COALESCE(m.total, 0),
        'completed', COALESCE(m.completed, 0),
        'cancelled', COALESCE(m.cancelled, 0)
    ) ORDER BY COALESCE(m.total, 0) DESC)
    FROM meeting_types mt
    LEFT JOIN (
        SELECT 
            meeting_type_id,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
        FROM meetings
        WHERE start_at BETWEEN v_start_date AND v_end_date
        AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        GROUP BY meeting_type_id
    ) m ON mt.id = m.meeting_type_id
    WHERE mt.is_active = true
    INTO v_result;
    
    RETURN COALESCE(v_result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5) Function: admin_meeting_trends
-- اتجاهات الاجتماعات عبر الزمن
-- =====================================================

CREATE OR REPLACE FUNCTION admin_meeting_trends(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL,
    p_granularity TEXT DEFAULT 'day' -- 'day', 'week', 'month'
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
    v_trunc_format TEXT;
BEGIN
    v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
    v_end_date := COALESCE(p_end_date, NOW());
    
    v_trunc_format := CASE p_granularity
        WHEN 'week' THEN 'week'
        WHEN 'month' THEN 'month'
        ELSE 'day'
    END;
    
    SELECT json_agg(json_build_object(
        'date', period,
        'total', total,
        'completed', completed,
        'cancelled', cancelled,
        'no_show', no_show
    ) ORDER BY period)
    FROM (
        SELECT 
            DATE_TRUNC(v_trunc_format, start_at)::DATE as period,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
            COUNT(*) FILTER (WHERE status = 'no_show') as no_show
        FROM meetings
        WHERE start_at BETWEEN v_start_date AND v_end_date
        AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        GROUP BY DATE_TRUNC(v_trunc_format, start_at)
    ) t
    INTO v_result;
    
    RETURN COALESCE(v_result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6) Function: admin_top_clients
-- أكثر العملاء حجزاً
-- =====================================================

CREATE OR REPLACE FUNCTION admin_top_clients(
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL,
    p_employee_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 10
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
        'client_email', client_email,
        'client_name', client_name,
        'total_meetings', total,
        'completed', completed,
        'cancelled', cancelled,
        'first_meeting', first_meeting,
        'last_meeting', last_meeting
    ))
    FROM (
        SELECT 
            client_email,
            MAX(client_name) as client_name,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
            MIN(start_at) as first_meeting,
            MAX(start_at) as last_meeting
        FROM meetings
        WHERE start_at BETWEEN v_start_date AND v_end_date
        AND (p_employee_id IS NULL OR employee_id = p_employee_id)
        GROUP BY client_email
        ORDER BY COUNT(*) DESC
        LIMIT p_limit
    ) tc
    INTO v_result;
    
    RETURN COALESCE(v_result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7) Function: admin_meeting_analytics_full
-- جلب جميع الإحصائيات في استدعاء واحد
-- =====================================================

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
        'by_employee', admin_meeting_by_employee(p_start_date, p_end_date),
        'by_type', admin_meeting_by_type(p_start_date, p_end_date, p_employee_id),
        'trends', admin_meeting_trends(p_start_date, p_end_date, p_employee_id, 'day'),
        'top_clients', admin_top_clients(p_start_date, p_end_date, p_employee_id, 10)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- نهاية Analytics Functions
-- =====================================================
