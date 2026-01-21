import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// حساب عدد الأيام بين تاريخين
function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

// جلب رصيد الإجازات
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    // جلب الإجازات المعتمدة للسنة الحالية (الإجازات العادية فقط تخصم من الرصيد)
    const { data: approvedLeaves, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'leave')
      .eq('status', 'approved')
      .eq('leave_category', 'regular')
      .gte('start_date', yearStart)
      .lte('end_date', yearEnd);

    if (error && error.code !== '42P01') {
      console.error('Error fetching leave requests:', error);
    }

    // حساب الأيام المستخدمة
    let usedDays = 0;
    if (approvedLeaves) {
      for (const leave of approvedLeaves) {
        usedDays += calculateDays(leave.start_date, leave.end_date);
      }
    }

    const totalDays = 21; // الرصيد السنوي
    const remainingDays = Math.max(0, totalDays - usedDays);

    return NextResponse.json({
      balance: {
        total: totalDays,
        used: usedDays,
        remaining: remainingDays,
        year: currentYear
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      balance: {
        total: 21,
        used: 0,
        remaining: 21,
        year: new Date().getFullYear()
      }
    });
  }
}
