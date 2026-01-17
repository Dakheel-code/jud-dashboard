import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
