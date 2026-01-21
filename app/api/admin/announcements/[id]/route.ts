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

// جلب تعميم محدد
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const { id } = params;

    const { data: announcement, error } = await supabase
      .from('announcements')
      .select(`
        *,
        creator:admin_users!created_by(id, name, username, avatar),
        target_users:announcement_target_users(
          user:admin_users(id, name, username, avatar)
        ),
        reads:announcement_reads(
          user:admin_users(id, name, username, avatar),
          read_at
        ),
        conditions:announcement_conditions(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching announcement:', error);
      return NextResponse.json({ error: 'فشل في جلب التعميم' }, { status: 500 });
    }

    return NextResponse.json({ announcement });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
