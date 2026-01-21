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

// جلب تعاميم المستخدم الحالي
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const unreadOnly = searchParams.get('unread') === 'true';

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    // جلب التعاميم الموجهة للمستخدم
    let query = supabase
      .from('announcement_reads')
      .select(`
        id,
        read_at,
        announcement:announcements(
          id,
          title,
          content,
          type,
          priority,
          status,
          created_at,
          sent_at,
          creator:admin_users!created_by(id, name, avatar)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false, foreignTable: 'announcements' });

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data: userAnnouncements, error } = await query;

    if (error) {
      console.error('Error fetching user announcements:', error);
      if (error.code === '42P01') {
        return NextResponse.json({ announcements: [], unread_count: 0 });
      }
      return NextResponse.json({ announcements: [], unread_count: 0 });
    }

    // تنسيق البيانات
    const announcements = userAnnouncements
      ?.filter((item: any) => item.announcement)
      .map((item: any) => ({
        ...item.announcement,
        read_at: item.read_at,
        read_id: item.id
      })) || [];

    // حساب عدد غير المقروءة
    const unreadCount = announcements.filter((a: any) => !a.read_at).length;

    return NextResponse.json({ 
      announcements,
      unread_count: unreadCount
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ announcements: [], unread_count: 0 });
  }
}
