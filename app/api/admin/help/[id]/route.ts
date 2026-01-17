import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// PUT - Reply to help request
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  console.log('=== ADMIN: REPLY TO HELP REQUEST ===');
  
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.error('❌ Supabase credentials missing');
      return NextResponse.json({ error: 'خطأ في الإعدادات' }, { status: 500 });
    }

    const supabase = createClient(url, key);
    const { id } = await context.params;
    const body = await request.json();
    const { reply } = body;

    console.log('📝 Request ID:', id);
    console.log('📝 Reply:', reply);

    if (!reply) {
      return NextResponse.json({ error: 'Reply is required' }, { status: 400 });
    }

    // Get the help request first
    console.log('🔍 Fetching help request...');
    const { data: helpRequest, error: fetchError } = await supabase
      .from('help_requests')
      .select('store_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching help request:', fetchError);
      return NextResponse.json({ error: 'طلب المساعدة غير موجود' }, { status: 404 });
    }

    console.log('✅ Help request found:', helpRequest);

    // Update the help request
    console.log('📤 Updating help request...');
    const { data, error } = await supabase
      .from('help_requests')
      .update({
        reply,
        status: 'replied',
        replied_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating help request:', error);
      return NextResponse.json({ error: 'فشل تحديث الطلب' }, { status: 500 });
    }

    console.log('✅ Help request updated:', data);

    // Create notification for the store
    console.log('🔔 Creating notification...');
    const { data: notifData, error: notifError } = await supabase
      .from('notifications')
      .insert({
        store_id: helpRequest.store_id,
        title: 'تم الرد على استفسارك',
        message: reply,
        type: 'help_reply',
        help_request_id: id
      })
      .select()
      .single();

    if (notifError) {
      console.error('⚠️ Error creating notification:', notifError);
    } else {
      console.log('✅ Notification created:', notifData);
    }

    // إرسال إشعار Slack للرد على طلب المساعدة
    try {
      // جلب معلومات المتجر والطلب
      const { data: storeInfo } = await supabase
        .from('stores')
        .select('store_url')
        .eq('id', helpRequest.store_id)
        .single();
      
      const { data: fullRequest } = await supabase
        .from('help_requests')
        .select('message, task_id')
        .eq('id', id)
        .single();
      
      let taskTitle = null;
      if (fullRequest?.task_id) {
        const { data: taskInfo } = await supabase
          .from('tasks')
          .select('title')
          .eq('id', fullRequest.task_id)
          .single();
        taskTitle = taskInfo?.title;
      }
      
      await fetch(`${request.nextUrl.origin}/api/admin/slack/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'help_reply',
          data: {
            store_url: storeInfo?.store_url,
            store_id: helpRequest.store_id,
            task_title: taskTitle,
            message: fullRequest?.message,
            reply
          }
        })
      });
    } catch (slackError) {
      console.error('Slack notification error:', slackError);
    }

    console.log('=== SUCCESS ===');
    return NextResponse.json({ success: true, request: data });
  } catch (error: any) {
    console.error('❌ FATAL ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete help request
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  console.log('=== ADMIN: DELETE HELP REQUEST ===');
  
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      return NextResponse.json({ error: 'خطأ في الإعدادات' }, { status: 500 });
    }

    const supabase = createClient(url, key);
    const { id } = await context.params;

    console.log('🗑️ Deleting help request:', id);

    const { error } = await supabase
      .from('help_requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Delete error:', error);
      return NextResponse.json({ error: 'فشل حذف الطلب' }, { status: 500 });
    }

    console.log('✅ Help request deleted');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ FATAL ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
