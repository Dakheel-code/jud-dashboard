import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET - Get help requests for a store
export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.error('❌ Supabase credentials missing');
      return NextResponse.json({ requests: [] });
    }

    const supabase = createClient(url, key);
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('store_id');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID required' }, { status: 400 });
    }

    console.log('📥 Fetching help requests for store:', storeId);

    const { data, error } = await supabase
      .from('help_requests')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      return NextResponse.json({ requests: [] });
    }

    console.log('✅ Help requests fetched:', data?.length || 0);
    return NextResponse.json({ requests: data || [] });
  } catch (error: any) {
    console.error('❌ Error fetching help requests:', error);
    return NextResponse.json({ requests: [] });
  }
}

// POST - Create new help request
export async function POST(request: NextRequest) {
  console.log('=== CREATE HELP REQUEST ===');
  
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('🔧 Supabase URL:', url ? 'Set' : 'Missing');
    console.log('🔧 Supabase Key:', key ? 'Set' : 'Missing');
    
    if (!url || !key) {
      console.error('❌ Supabase credentials missing');
      return NextResponse.json(
        { error: 'خطأ في إعدادات قاعدة البيانات' },
        { status: 500 }
      );
    }

    const supabase = createClient(url, key);
    const body = await request.json();
    const { store_id, task_id, message } = body;

    console.log('📝 Request data:', { store_id, task_id, message });

    if (!store_id || !message) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Store ID and message are required' },
        { status: 400 }
      );
    }

    // First verify the store exists
    console.log('🔍 Verifying store exists...');
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', store_id)
      .single();

    if (storeError) {
      console.error('❌ Store not found:', storeError);
      return NextResponse.json(
        { error: 'المتجر غير موجود' },
        { status: 404 }
      );
    }

    console.log('✅ Store verified:', storeData);

    // Insert help request
    console.log('📤 Inserting help request...');
    const { data, error } = await supabase
      .from('help_requests')
      .insert({
        store_id,
        task_id: task_id || null,
        message,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Insert error:', error);
      return NextResponse.json(
        { error: `فشل إرسال الطلب: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Help request created:', data);
    console.log('=== SUCCESS ===');
    
    return NextResponse.json({ success: true, request: data });
  } catch (error: any) {
    console.error('❌ FATAL ERROR:', error);
    return NextResponse.json({ 
      error: error.message || 'فشل إرسال الطلب'
    }, { status: 500 });
  }
}
