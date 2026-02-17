import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Simple password hashing (same as users route)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function PUT(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await request.json();
    
    // Get user ID from request body (sent from frontend)
    const { userId, name, email, phone, avatar, currentPassword, newPassword } = body;

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    // Build update object
    const updateData: Record<string, string> = {};
    
    if (name) {
      updateData.name = name;
    }
    
    if (email) {
      updateData.email = email;
    }

    if (phone) {
      updateData.phone = phone;
    }

    if (avatar) {
      updateData.avatar = avatar;
    }

    // If changing password, verify current password first
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'يجب إدخال كلمة المرور الحالية' }, { status: 400 });
      }

      // Get current user
      const { data: user, error: userError } = await supabase
        .from('admin_users')
        .select('password_hash')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
      }

      // Verify current password (using sha256 hash)
      const hashedCurrentPassword = hashPassword(currentPassword);
      if (hashedCurrentPassword !== user.password_hash) {
        return NextResponse.json({ error: 'كلمة المرور الحالية غير صحيحة' }, { status: 400 });
      }

      // Hash new password
      updateData.password_hash = hashPassword(newPassword);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'لا توجد بيانات للتحديث' }, { status: 400 });
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', userId)
      .select('id, name, email, phone, avatar, username, role')
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'فشل تحديث البيانات' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'تم تحديث البيانات بنجاح'
    });

  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}
