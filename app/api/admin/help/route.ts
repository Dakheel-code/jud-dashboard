import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// PUT - Reply to help request (using query param instead of dynamic route)
export async function PUT(request: NextRequest) {
  console.log('=== ADMIN: REPLY TO HELP REQUEST ===');
  
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.error('❌ Supabase credentials missing');
      return NextResponse.json({ error: 'خطأ في الإعدادات' }, { status: 500 });
    }

    const supabase = createClient(url, key);
    const body = await request.json();
    const { id, reply } = body;

    console.log('📝 Request ID:', id);
    console.log('📝 Reply:', reply);

    if (!id || !reply) {
      return NextResponse.json({ error: 'ID and Reply are required' }, { status: 400 });
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

    console.log('=== SUCCESS ===');
    return NextResponse.json({ success: true, request: data });
  } catch (error: any) {
    console.error('❌ FATAL ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete help request
export async function DELETE(request: NextRequest) {
  console.log('=== ADMIN: DELETE HELP REQUEST ===');
  
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      return NextResponse.json({ error: 'خطأ في الإعدادات' }, { status: 500 });
    }

    const supabase = createClient(url, key);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

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

// GET - Get all help requests for admin
export async function GET() {
  console.log('=== ADMIN: FETCH HELP REQUESTS ===');
  
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('🔧 Supabase URL:', url ? 'Set' : 'Missing');
    
    if (!url || !key) {
      console.error('❌ Supabase credentials missing');
      return NextResponse.json({ requests: [] });
    }

    const supabase = createClient(url, key);
    
    console.log('📥 Fetching all help requests...');
    
    const { data, error } = await supabase
      .from('help_requests')
      .select(`
        *,
        stores (store_url),
        tasks (title)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      return NextResponse.json({ requests: [] });
    }

    console.log('✅ Raw data:', data);

    // Format the data
    const formattedData = data?.map(item => ({
      ...item,
      store_url: item.stores?.store_url,
      task_title: item.tasks?.title
    })) || [];

    console.log('✅ Formatted data:', formattedData.length, 'requests');
    console.log('=== SUCCESS ===');

    return NextResponse.json({ requests: formattedData });
  } catch (error: any) {
    console.error('❌ FATAL ERROR:', error);
    return NextResponse.json({ requests: [] });
  }
}
