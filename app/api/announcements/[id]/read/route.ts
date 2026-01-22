import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
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
  const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };
  
  try {
    const supabase = getSupabaseClient();
    const { id: announcementId } = params;
    const body = await request.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'معرف المستخدم مطلوب' }, 
        { status: 400, headers }
      );
    }

    if (!announcementId) {
      return NextResponse.json(
        { error: 'معرف التعميم مطلوب' }, 
        { status: 400, headers }
      );
    }

    // Try new table first (announcement_recipients)
    const { data: newTableData, error: newTableError } = await supabase
      .from('announcement_recipients')
      .update({ read_at: new Date().toISOString() })
      .eq('announcement_id', announcementId)
      .eq('user_id', user_id)
      .is('read_at', null)
      .select();

    if (!newTableError && newTableData && newTableData.length > 0) {
      return NextResponse.json(
        { success: true, message: 'تم تعليم التعميم كمقروء', updated: newTableData },
        { headers }
      );
    }

    // Fallback to old table (announcement_reads)
    const { data: oldTableData, error: oldTableError } = await supabase
      .from('announcement_reads')
      .update({ read_at: new Date().toISOString() })
      .eq('announcement_id', announcementId)
      .eq('user_id', user_id)
      .is('read_at', null)
      .select();

    if (oldTableError) {
      console.error('Error marking as read:', oldTableError);
      return NextResponse.json(
        { error: 'فشل في تعليم التعميم كمقروء' }, 
        { status: 500, headers }
      );
    }

    return NextResponse.json(
      { success: true, message: 'تم تعليم التعميم كمقروء', updated: oldTableData },
      { headers }
    );

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ' }, 
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  }
}
