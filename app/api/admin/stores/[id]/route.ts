import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database configuration error');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// GET - Get store by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ store });
  } catch (error: any) {
    console.error('Error fetching store:', error);
    return NextResponse.json({ error: 'Failed to fetch store' }, { status: 500 });
  }
}

// PUT - Update store
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const updateData: Record<string, any> = {};
    
    if (body.store_name) updateData.store_name = body.store_name;
    if (body.owner_name !== undefined) updateData.owner_name = body.owner_name;
    if (body.owner_phone !== undefined) updateData.owner_phone = body.owner_phone;
    if (body.owner_email !== undefined) updateData.owner_email = body.owner_email;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.priority) updateData.priority = body.priority;
    if (body.status) updateData.status = body.status;
    if (body.subscription_start_date !== undefined) {
      updateData.subscription_start_date = body.subscription_start_date || null;
    }
    if (body.snapchat_account !== undefined) updateData.snapchat_account = body.snapchat_account || null;
    if (body.tiktok_account !== undefined) updateData.tiktok_account = body.tiktok_account || null;
    if (body.google_account !== undefined) updateData.google_account = body.google_account || null;
    if (body.meta_account !== undefined) updateData.meta_account = body.meta_account || null;
    if (body.client_id !== undefined) updateData.client_id = body.client_id;
    if (body.media_buyer_id !== undefined) updateData.media_buyer_id = body.media_buyer_id || null;
    if (body.store_group_url !== undefined) updateData.store_group_url = body.store_group_url || null;
    if (body.category !== undefined) updateData.category = body.category || null;

    const { data: store, error } = await supabase
      .from('stores')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating store:', error);
      throw error;
    }

    return NextResponse.json({ success: true, store });
  } catch (error: any) {
    console.error('Error updating store:', error);
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
  }
}

// DELETE - Delete store and all its progress
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('=== DELETE STORE REQUEST ===');
    console.log('Store ID:', params.id);
    
    const { id } = params;

    if (!id) {
      console.error('❌ No store ID provided');
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    // إنشاء Supabase client جديد للتأكد من الاتصال
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials missing');
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      );
    }

    console.log('✅ Supabase URL:', supabaseUrl);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // أولاً: التحقق من وجود المتجر
    console.log('🔍 Checking if store exists...');
    const { data: existingStore, error: checkError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError) {
      console.error('❌ Error checking store:', checkError);
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404 }
        );
      }
      throw checkError;
    }

    console.log('✅ Store found:', existingStore);

    // ثانياً: حذف المتجر
    console.log('🗑️ Deleting store...');
    const { data: deletedData, error: deleteError } = await supabase
      .from('stores')
      .delete()
      .eq('id', id)
      .select();

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      throw deleteError;
    }

    console.log('✅ Delete result:', deletedData);

    // التحقق من نجاح الحذف
    if (!deletedData || deletedData.length === 0) {
      console.error('❌ No rows deleted');
      return NextResponse.json(
        { error: 'Failed to delete store' },
        { status: 500 }
      );
    }

    // ثالثاً: التحقق من أن المتجر تم حذفه فعلياً
    console.log('🔍 Verifying deletion...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', id);

    if (verifyError) {
      console.error('⚠️ Verification error:', verifyError);
    } else {
      console.log('✅ Verification result:', verifyData?.length === 0 ? 'Store deleted' : 'Store still exists!');
    }

    console.log('=== DELETE COMPLETED SUCCESSFULLY ===');

    return NextResponse.json({ 
      success: true,
      message: 'Store deleted successfully',
      deleted: deletedData[0],
      verified: verifyData?.length === 0
    });

  } catch (error: any) {
    console.error('❌ FATAL ERROR:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete store',
        details: error.message,
        code: error.code
      },
      { status: 500 }
    );
  }
}
