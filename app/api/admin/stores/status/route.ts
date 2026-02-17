import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(request: Request) {
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await request.json();
    
    const { id, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف المتجر مطلوب' }, { status: 400 });
    }

    if (!status || !['new', 'active', 'paused', 'expired'].includes(status)) {
      return NextResponse.json({ error: 'حالة غير صالحة' }, { status: 400 });
    }


    // تحديث حالة المتجر
    const { data: updatedStore, error: updateError } = await supabase
      .from('stores')
      .update({
        status,
        is_active: status === 'active' || status === 'new',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'فشل تحديث حالة المتجر: ' + updateError.message }, { status: 500 });
    }


    return NextResponse.json({ 
      success: true, 
      store: updatedStore,
      message: 'تم تحديث حالة المتجر بنجاح'
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
