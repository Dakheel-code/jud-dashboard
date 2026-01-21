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

// تعليم تعميم كمقروء
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const { id } = params;
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    // تحديث سجل القراءة
    const { error } = await supabase
      .from('announcement_reads')
      .update({ read_at: new Date().toISOString() })
      .eq('announcement_id', id)
      .eq('user_id', user_id);

    if (error) {
      console.error('Error marking as read:', error);
      return NextResponse.json({ error: 'فشل في تعليم التعميم كمقروء' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم تعليم التعميم كمقروء'
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
