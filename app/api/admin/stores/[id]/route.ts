import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
      .select(`
        id, store_name, store_url, owner_name, owner_phone, owner_email,
        account_manager_id, media_buyer_id, designer_id, notes, priority, budget, status,
        is_active, created_at, updated_at, subscription_start_date,
        store_group_url, category, client_id,
        billing_type, billing_amount,
        snapchat_account, tiktok_account, google_account, meta_account,
        client:clients(id, name, phone, email),
        account_manager:admin_users!stores_account_manager_id_fkey(id, name, avatar),
        media_buyer:admin_users!stores_media_buyer_id_fkey(id, name, avatar),
        designer:admin_users!stores_designer_id_fkey(id, name, avatar)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Store not found' }, { status: 404 });
      }
      throw error;
    }

    // استخدام اسم العميل من جدول clients إذا كان متاحاً (أصح من owner_name)
    const client = store.client as any;
    const enrichedStore = {
      ...store,
      owner_name: client?.name || store.owner_name,
      owner_phone: client?.phone || store.owner_phone,
      owner_email: client?.email || store.owner_email,
    };

    return NextResponse.json({ store: enrichedStore });
  } catch (error: any) {
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
    if (body.designer_id    !== undefined) updateData.designer_id    = body.designer_id    || null;
    if (body.store_group_url !== undefined) updateData.store_group_url = body.store_group_url || null;
    if (body.category !== undefined) updateData.category = body.category || null;
    if (body.billing_type !== undefined) updateData.billing_type = body.billing_type || null;
    if (body.billing_amount !== undefined) updateData.billing_amount = body.billing_amount != null ? body.billing_amount : null;

    const { data: store, error } = await supabase
      .from('stores')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, store });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update store' }, { status: 500 });
  }
}

// DELETE - Delete store and all its progress
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // أولاً: التحقق من وجود المتجر
    const { data: existingStore, error: checkError } = await supabase
      .from('stores')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404 }
        );
      }
      throw checkError;
    }


    // ثانياً: حذف المتجر
    const { data: deletedData, error: deleteError } = await supabase
      .from('stores')
      .delete()
      .eq('id', id)
      .select();

    if (deleteError) {
      throw deleteError;
    }


    // التحقق من نجاح الحذف
    if (!deletedData || deletedData.length === 0) {
      return NextResponse.json(
        { error: 'Failed to delete store' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Store deleted successfully',
      deleted: deletedData[0],
    });

  } catch (error: any) {
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
