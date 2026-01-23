import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Database configuration error');
  return createClient(url, key);
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = cookies();
    const adminUserCookie = cookieStore.get('admin_user');
    if (adminUserCookie?.value) {
      const adminUser = JSON.parse(adminUserCookie.value);
      if (adminUser?.id) return adminUser.id;
    }
  } catch (e) {}
  return null;
}

// GET - Get notifications for current user
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const unreadCount = data?.filter(n => !n.read_at).length || 0;

    return NextResponse.json({ notifications: data || [], unreadCount });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

// PUT - Mark notification(s) as read
export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const body = await request.json();
    const { notification_id, mark_all_read } = body;
    const now = new Date().toISOString();

    if (mark_all_read) {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) {
        console.error('Error:', error);
        return NextResponse.json({ success: false });
      }
      return NextResponse.json({ success: true });
    }

    if (notification_id) {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', notification_id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error:', error);
        return NextResponse.json({ success: false });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ success: false });
  }
}

// DELETE - Delete notification(s)
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    const deleteAll = searchParams.get('all') === 'true';

    if (deleteAll) {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error:', error);
        return NextResponse.json({ success: false });
      }
      return NextResponse.json({ success: true });
    }

    if (notificationId) {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error:', error);
        return NextResponse.json({ success: false });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ success: false });
  }
}
