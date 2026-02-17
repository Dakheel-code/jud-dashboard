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

interface SendAnnouncementPayload {
  title: string;
  content: string;
  type: 'normal' | 'urgent' | 'scheduled' | 'conditional';
  priority: 'low' | 'normal' | 'high' | 'critical';
  target_type: 'all' | 'department' | 'users';
  target_department_id?: string;
  target_user_ids?: string[];
  send_now?: boolean;
  send_at?: string;
  created_by: string;
}

// إرسال تعميم جديد
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };
  
  try {
    const supabase = getSupabaseClient();
    const body: SendAnnouncementPayload = await request.json();

    const {
      title,
      content,
      type = 'normal',
      priority = 'normal',
      target_type = 'all',
      target_department_id,
      target_user_ids,
      send_now = true,
      send_at,
      created_by
    } = body;

    // Validation
    if (!title || !content) {
      return NextResponse.json(
        { error: 'العنوان والمحتوى مطلوبان' },
        { status: 400, headers }
      );
    }

    if (!created_by) {
      return NextResponse.json(
        { error: 'معرف المنشئ مطلوب' },
        { status: 400, headers }
      );
    }

    // Create announcement
    const announcementData: any = {
      title,
      content,
      type,
      priority,
      target_type,
      target_department_id: target_department_id || null,
      target_user_ids: target_user_ids || null,
      created_by,
      created_at: new Date().toISOString(),
      is_active: true,
      send_at: null,
      sent_at: null
    };

    // Handle scheduled announcements
    if (type === 'scheduled' && send_at) {
      announcementData.send_at = send_at;
      // TODO: Implement Netlify Scheduled Functions or Supabase cron
      // to automatically set sent_at when send_at time is reached
    }

    // Set sent_at if sending now
    if (send_now) {
      announcementData.sent_at = new Date().toISOString();
    }

    const { data: announcement, error: createError } = await supabase
      .from('announcements')
      .insert(announcementData)
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { error: 'فشل في إنشاء التعميم' },
        { status: 500, headers }
      );
    }

    // Determine recipients
    let recipientUserIds: string[] = [];

    if (target_type === 'all') {
      // Get all users from admin_users table
      const { data: users, error: usersError } = await supabase
        .from('admin_users')
        .select('id');

      if (usersError) {
      } else {
        recipientUserIds = users?.map((u: any) => u.id) || [];
      }
    } else if (target_type === 'department' && target_department_id) {
      // Get users from specific department
      const { data: users, error: usersError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('department_id', target_department_id);

      if (usersError) {
      } else {
        recipientUserIds = users?.map((u: any) => u.id) || [];
      }
    } else if (target_type === 'users' && target_user_ids && target_user_ids.length > 0) {
      recipientUserIds = target_user_ids;
    }

    // Create recipient records (only if sending now or for scheduled)
    if (recipientUserIds.length > 0) {
      const recipientRecords = recipientUserIds.map(userId => ({
        announcement_id: announcement.id,
        user_id: userId,
        delivered_at: send_now ? new Date().toISOString() : null,
        read_at: null
      }));

      // Bulk insert with conflict handling
      const { error: recipientsError } = await supabase
        .from('announcement_recipients')
        .upsert(recipientRecords, { 
          onConflict: 'announcement_id,user_id',
          ignoreDuplicates: true 
        });

      if (recipientsError) {
        // Try old table as fallback
        const oldRecords = recipientUserIds.map(userId => ({
          announcement_id: announcement.id,
          user_id: userId,
          read_at: null
        }));

        await supabase
          .from('announcement_reads')
          .upsert(oldRecords, { 
            onConflict: 'announcement_id,user_id',
            ignoreDuplicates: true 
          });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: send_now ? 'تم إرسال التعميم بنجاح' : 'تم جدولة التعميم بنجاح',
        announcement,
        recipients_count: recipientUserIds.length
      },
      { headers }
    );

  } catch (error) {
    return NextResponse.json(
      { error: 'حدث خطأ' },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  }
}

// TODO: Implement scheduled announcement processing
// This should be done via:
// 1. Netlify Scheduled Functions (recommended for Netlify deployment)
// 2. Supabase pg_cron extension
// 3. External cron service
//
// The cron job should:
// 1. Query announcements WHERE sent_at IS NULL AND send_at <= NOW() AND is_active = true
// 2. For each announcement:
//    a. Update sent_at = NOW()
//    b. Update announcement_recipients.delivered_at = NOW() for all recipients
