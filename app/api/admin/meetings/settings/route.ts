/**
 * API: إعدادات الاجتماعات للموظف
 * GET /api/admin/meetings/settings - جلب الإعدادات
 * PUT /api/admin/meetings/settings - تحديث الإعدادات
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials missing');
  }
  return createClient(supabaseUrl, supabaseKey);
}

// جلب معرف المستخدم الحالي
async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  try {
    // محاولة من الـ cookies
    const cookieStore = cookies();
    const userCookie = cookieStore.get('admin_user');
    if (userCookie?.value) {
      const user = JSON.parse(userCookie.value);
      if (user.id) return user.id;
    }
    
    // محاولة من الـ request cookies
    const reqCookie = request.cookies.get('admin_user');
    if (reqCookie?.value) {
      const user = JSON.parse(reqCookie.value);
      if (user.id) return user.id;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // التحقق من المصادقة
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'غير مصرح', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    const supabase = getSupabase();
    
    // جلب الإعدادات وأوقات العمل
    const [settingsResult, availabilityResult] = await Promise.all([
      supabase.from('employee_meeting_settings').select('*').eq('employee_id', userId).single(),
      supabase.from('employee_availability').select('*').eq('employee_id', userId),
    ]);
    
    let settings = settingsResult.data;
    const availability = availabilityResult.data || [];
    
    // إنشاء إعدادات افتراضية إذا لم تكن موجودة
    if (!settings) {
      // جلب اسم المستخدم لإنشاء slug
      const { data: user } = await supabase
        .from('admin_users')
        .select('name, username')
        .eq('id', userId)
        .single();
      
      // إنشاء slug من الاسم أو username
      const baseSlug = (user?.username || user?.name || userId)
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      const { data: newSettings, error } = await supabase
        .from('employee_meeting_settings')
        .insert({
          employee_id: userId,
          booking_slug: baseSlug,
          is_accepting_meetings: true,
          slot_duration: 30,
          buffer_before: 5,
          buffer_after: 5,
          max_meetings_per_day: 8,
          max_advance_days: 30,
          min_notice_hours: 24,
        })
        .select()
        .single();
      
      if (!error && newSettings) {
        settings = newSettings;
      }
    }
    
    // تحويل أوقات العمل إلى صيغة مناسبة
    const workingHours: Record<string, { start: string; end: string; enabled: boolean }> = {};
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    
    dayNames.forEach((day, index) => {
      const dayAvailability = availability.find((a: { day_of_week: number }) => a.day_of_week === index);
      workingHours[day] = {
        start: dayAvailability?.start_time || '09:00',
        end: dayAvailability?.end_time || '17:00',
        enabled: dayAvailability?.is_enabled ?? (index < 5), // الأحد-الخميس افتراضياً
      };
    });
    
    // جلب حالة ربط Google Calendar
    const { data: googleAccount } = await supabase
      .from('google_oauth_accounts')
      .select('google_email, calendar_name, sync_enabled')
      .eq('employee_id', userId)
      .single();
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jud-dashboard.netlify.app';
    
    return NextResponse.json({
      success: true,
      settings: {
        ...settings,
        working_hours: workingHours,
        google_calendar_connected: !!googleAccount,
        google_email: googleAccount?.google_email,
        google_calendar_name: googleAccount?.calendar_name,
        booking_page_url: settings?.booking_slug 
          ? `${baseUrl}/book/${settings.booking_slug}`
          : null,
      },
    });
    
  } catch (error) {
    console.error('Error in GET /api/admin/meetings/settings:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // التحقق من المصادقة
    const userId = await getCurrentUserId(request);
    console.log('PUT settings - userId:', userId);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'غير مصرح - يرجى تسجيل الدخول', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    console.log('PUT settings - body:', JSON.stringify(body));
    
    const supabase = getSupabase();
    
    // جلب اسم المستخدم لإنشاء slug إذا لم يكن موجوداً
    const { data: user } = await supabase
      .from('admin_users')
      .select('name, username')
      .eq('id', userId)
      .single();
    
    const baseSlug = (user?.username || user?.name || 'user')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '') || `user-${Date.now()}`;
    
    // تحديث أو إنشاء الإعدادات الأساسية
    const settingsData: Record<string, any> = {
      employee_id: userId,
      booking_slug: baseSlug,
      is_accepting_meetings: body.is_accepting_meetings ?? true,
      slot_duration: body.slot_duration ?? 30,
    };

    // إضافة الحقول الجديدة إذا موجودة (استخدام أسماء الأعمدة الصحيحة)
    if (body.max_days_ahead !== undefined) settingsData.max_advance_days = body.max_days_ahead;
    if (body.min_notice_hours !== undefined) settingsData.min_notice_hours = body.min_notice_hours;
    if (body.buffer_minutes !== undefined) {
      settingsData.buffer_before = Math.floor(body.buffer_minutes / 2);
      settingsData.buffer_after = Math.ceil(body.buffer_minutes / 2);
    }
    if (body.meeting_title !== undefined) settingsData.welcome_message = body.meeting_title;
    
    console.log('PUT settings - settingsData:', JSON.stringify(settingsData));
    
    const { data: savedSettings, error: settingsError } = await supabase
      .from('employee_meeting_settings')
      .upsert(settingsData, {
        onConflict: 'employee_id',
      })
      .select()
      .single();
    
    if (settingsError) {
      console.error('Error updating settings:', settingsError);
      return NextResponse.json(
        { error: 'فشل تحديث الإعدادات: ' + settingsError.message, code: 'UPDATE_FAILED', details: settingsError },
        { status: 500 }
      );
    }
    
    console.log('PUT settings - savedSettings:', JSON.stringify(savedSettings));
    
    // تحديث أوقات العمل إذا موجودة
    if (body.working_hours) {
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      
      for (let i = 0; i < dayNames.length; i++) {
        const dayData = body.working_hours[dayNames[i]];
        if (dayData) {
          const availData = {
            employee_id: userId,
            day_of_week: i,
            start_time: dayData.start || '09:00',
            end_time: dayData.end || '17:00',
            is_enabled: dayData.enabled ?? true,
          };
          
          const { error: availError } = await supabase
            .from('employee_availability')
            .upsert(availData, {
              onConflict: 'employee_id,day_of_week',
            });
          
          if (availError) {
            console.error(`Error updating availability for day ${i}:`, availError);
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'تم تحديث الإعدادات بنجاح ✓',
      settings: savedSettings,
    });
    
  } catch (error) {
    console.error('Error in PUT /api/admin/meetings/settings:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم: ' + (error instanceof Error ? error.message : 'Unknown'), code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
