/**
 * API: إدارة الإجازات والأوقات المحجوبة
 * GET /api/admin/meetings/time-off - جلب الإجازات
 * POST /api/admin/meetings/time-off - إضافة إجازة
 * DELETE /api/admin/meetings/time-off - حذف إجازة
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('admin_user');
    if (userCookie?.value) {
      const user = JSON.parse(userCookie.value);
      return user.id || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('employee_time_off')
      .select('*')
      .eq('employee_id', userId)
      .gte('end_at', new Date().toISOString())
      .order('start_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'فشل جلب الإجازات' }, { status: 500 });
    }

    return NextResponse.json({ success: true, time_offs: data });
  } catch (error) {
    console.error('Error in GET /api/admin/meetings/time-off:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const { title, start_at, end_at, reason } = body;

    if (!title || !start_at || !end_at) {
      return NextResponse.json({ error: 'البيانات غير مكتملة' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('employee_time_off')
      .insert({
        employee_id: userId,
        title,
        start_at,
        end_at,
        reason,
        type: 'time_off',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating time off:', error);
      return NextResponse.json({ error: 'فشل إضافة الإجازة' }, { status: 500 });
    }

    return NextResponse.json({ success: true, time_off: data });
  } catch (error) {
    console.error('Error in POST /api/admin/meetings/time-off:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الإجازة مطلوب' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('employee_time_off')
      .delete()
      .eq('id', id)
      .eq('employee_id', userId);

    if (error) {
      return NextResponse.json({ error: 'فشل حذف الإجازة' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/meetings/time-off:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
