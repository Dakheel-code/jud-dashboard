import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// GET - جلب جميع المستخدمين
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();

    const { data: users, error } = await supabase
      .from('admin_users')
      .select('id, username, name, email, role, permissions, is_active, last_login, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'فشل في جلب المستخدمين' }, { status: 500 });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// POST - إضافة مستخدم جديد
export async function POST(request: NextRequest) {
  try {
    const { username, password, name, email, role, permissions } = await request.json();

    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { error: 'جميع الحقول المطلوبة يجب ملؤها' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // التحقق من عدم وجود المستخدم
    const { data: existingUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'اسم المستخدم موجود مسبقاً' },
        { status: 400 }
      );
    }

    // إضافة المستخدم
    const { data: newUser, error } = await supabase
      .from('admin_users')
      .insert({
        username,
        password_hash: hashPassword(password),
        name,
        email: email || null,
        role,
        permissions: permissions || [],
        is_active: true
      })
      .select('id, username, name, email, role, permissions, is_active, created_at')
      .single();

    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json({ error: 'فشل في إنشاء المستخدم' }, { status: 500 });
    }

    return NextResponse.json({ user: newUser, message: 'تم إنشاء المستخدم بنجاح' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// PUT - تحديث مستخدم
export async function PUT(request: NextRequest) {
  try {
    const { id, username, password, name, email, role, permissions, is_active } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (username) updateData.username = username;
    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role) updateData.role = role;
    if (permissions) updateData.permissions = permissions;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (password) updateData.password_hash = hashPassword(password);

    const { data: updatedUser, error } = await supabase
      .from('admin_users')
      .update(updateData)
      .eq('id', id)
      .select('id, username, name, email, role, permissions, is_active, created_at')
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ error: 'فشل في تحديث المستخدم' }, { status: 500 });
    }

    return NextResponse.json({ user: updatedUser, message: 'تم تحديث المستخدم بنجاح' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// DELETE - حذف مستخدم
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // حذف جلسات المستخدم أولاً
    await supabase.from('admin_sessions').delete().eq('user_id', id);

    // حذف المستخدم
    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting user:', error);
      return NextResponse.json({ error: 'فشل في حذف المستخدم' }, { status: 500 });
    }

    return NextResponse.json({ message: 'تم حذف المستخدم بنجاح' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
