import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET - Get notifications for a store
export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const supabase = createClient(url, key);
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');

    if (!storeId) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    console.log('📥 Fetching notifications for store:', storeId);

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching notifications:', error);
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const unreadCount = data?.filter(n => !n.is_read).length || 0;
    console.log('✅ Notifications fetched:', data?.length || 0, 'unread:', unreadCount);

    return NextResponse.json({ notifications: data || [], unreadCount });
  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

// PUT - Mark notification as read
export async function PUT(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      return NextResponse.json({ success: false });
    }

    const supabase = createClient(url, key);
    const body = await request.json();
    const { notification_id, mark_all_read, store_id } = body;

    if (mark_all_read && store_id) {
      console.log('📝 Marking all notifications as read for store:', store_id);
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('store_id', store_id);

      if (error) {
        console.error('❌ Error:', error);
        return NextResponse.json({ success: false });
      }
      return NextResponse.json({ success: true });
    }

    if (notification_id) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification_id);

      if (error) {
        console.error('❌ Error:', error);
        return NextResponse.json({ success: false });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json({ success: false });
  }
}
