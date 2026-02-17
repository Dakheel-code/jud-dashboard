/**
 * API: جلب بيانات الموظف بالـ slug (عام)
 * GET /api/public/employee/[slug]
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials missing');
  }
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const supabase = getSupabase();

    // البحث بالـ booking_slug أولاً
    let { data: settings } = await supabase
      .from('employee_meeting_settings')
      .select('employee_id, is_accepting_meetings, welcome_message')
      .eq('booking_slug', slug)
      .single();

    let employeeId = settings?.employee_id;

    // إذا لم نجد بالـ slug، نحاول بالـ ID مباشرة
    if (!employeeId) {
      // التحقق من أن الـ slug هو UUID صالح
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(slug)) {
        employeeId = slug;
        
        // جلب الإعدادات بالـ employee_id
        const { data: settingsById } = await supabase
          .from('employee_meeting_settings')
          .select('is_accepting_meetings, welcome_message')
          .eq('employee_id', employeeId)
          .single();
        
        settings = settingsById ? { ...settingsById, employee_id: employeeId } : null;
      }
    }

    if (!employeeId) {
      return NextResponse.json(
        { error: 'الموظف غير موجود', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // التحقق من قبول الحجوزات
    if (settings && !settings.is_accepting_meetings) {
      return NextResponse.json(
        { error: 'الموظف لا يقبل حجوزات حالياً', code: 'NOT_ACCEPTING' },
        { status: 503 }
      );
    }

    // جلب بيانات الموظف
    const { data: employee, error } = await supabase
      .from('admin_users')
      .select('id, name, email, avatar, role')
      .eq('id', employeeId)
      .single();

    if (error || !employee) {
      return NextResponse.json(
        { error: 'الموظف غير موجود', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        avatar: employee.avatar,
        title: employee.role,
      },
      welcome_message: settings?.welcome_message,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'حدث خطأ', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
