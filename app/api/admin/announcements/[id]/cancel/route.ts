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

// إلغاء تعميم
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const { id } = params;

    // تحديث حالة التعميم
    const { error } = await supabase
      .from('announcements')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error cancelling announcement:', error);
      return NextResponse.json({ error: 'فشل في إلغاء التعميم' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم إلغاء التعميم بنجاح'
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
