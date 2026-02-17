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

// جلب تعاميم المستخدم
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const unreadOnly = searchParams.get('unread') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'معرف المستخدم مطلوب' }, 
        { 
          status: 400,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' }
        }
      );
    }

    // جلب التعاميم من الجدول الجديد announcement_recipients
    let query = supabase
      .from('announcement_recipients')
      .select(`
        id,
        read_at,
        delivered_at,
        announcement_id,
        user_id,
        announcement:announcements!inner(
          id,
          title,
          content,
          type,
          priority,
          created_at,
          sent_at,
          is_active
        )
      `)
      .eq('user_id', userId)
      .not('announcement.sent_at', 'is', null)
      .eq('announcement.is_active', true)
      .order('delivered_at', { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.is('read_at', null);
    }

    const { data: userAnnouncements, error } = await query;

    if (error) {
      // Fallback to old table structure if new one doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return await fetchFromOldTable(supabase, userId, unreadOnly);
      }
      return NextResponse.json(
        { announcements: [], unread_count: 0 },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
      );
    }

    // تنسيق البيانات
    const announcements = userAnnouncements
      ?.filter((item: any) => item.announcement)
      .map((item: any) => ({
        id: item.announcement.id,
        title: item.announcement.title,
        content: item.announcement.content,
        type: item.announcement.type,
        priority: item.announcement.priority,
        created_at: item.announcement.created_at,
        sent_at: item.announcement.sent_at,
        read_at: item.read_at,
        delivered_at: item.delivered_at,
        recipient_id: item.id
      })) || [];

    // حساب عدد غير المقروءة
    const unreadCount = announcements.filter((a: any) => !a.read_at).length;

    return NextResponse.json(
      { announcements, unread_count: unreadCount },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );

  } catch (error) {
    return NextResponse.json(
      { announcements: [], unread_count: 0 },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  }
}

// Fallback function for old table structure
async function fetchFromOldTable(supabase: any, userId: string, unreadOnly: boolean) {
  let query = supabase
    .from('announcement_reads')
    .select(`
      id,
      read_at,
      announcement_id,
      user_id,
      announcement:announcements(
        id,
        title,
        content,
        type,
        priority,
        status,
        created_at,
        sent_at
      )
    `)
    .eq('user_id', userId);

  if (unreadOnly) {
    query = query.is('read_at', null);
  }

  const { data: userAnnouncements, error } = await query;

  if (error) {
    return NextResponse.json(
      { announcements: [], unread_count: 0 },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  }

  const announcements = userAnnouncements
    ?.filter((item: any) => item.announcement)
    .map((item: any) => ({
      ...item.announcement,
      read_at: item.read_at,
      recipient_id: item.id
    })) || [];

  const unreadCount = announcements.filter((a: any) => !a.read_at).length;

  return NextResponse.json(
    { announcements, unread_count: unreadCount },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
  );
}
