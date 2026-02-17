import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// جلب جميع المكاتب
export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const officeId = searchParams.get('id');

    if (officeId) {
      // جلب مكتب محدد مع الموظفين
      const { data: office, error } = await supabase
        .from('offices')
        .select(`
          *,
          employees:office_employees(
            user:admin_users(id, name, username, role, roles, avatar)
          )
        `)
        .eq('id', officeId)
        .single();

      if (error) {
        return NextResponse.json({ error: 'فشل في جلب بيانات المكتب' }, { status: 500 });
      }

      return NextResponse.json({ office });
    }

    // جلب جميع المكاتب
    const { data: offices, error } = await supabase
      .from('offices')
      .select(`
        *,
        employees:office_employees(
          user:admin_users(id, name, username, role, roles, avatar)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ offices: [], message: 'جدول المكاتب غير موجود' });
      }
      return NextResponse.json({ offices: [] });
    }

    return NextResponse.json({ offices: offices || [] });

  } catch (error) {
    return NextResponse.json({ offices: [] });
  }
}

// إنشاء مكتب جديد
export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { name, address, phone, email, latitude, longitude, description, employees } = body;

    if (!name) {
      return NextResponse.json({ error: 'اسم المكتب مطلوب' }, { status: 400 });
    }

    // إنشاء المكتب
    const { data: office, error } = await supabase
      .from('offices')
      .insert({
        name,
        address,
        phone,
        email,
        latitude,
        longitude,
        description,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'فشل في إنشاء المكتب' }, { status: 500 });
    }

    // إضافة الموظفين للمكتب
    if (employees && employees.length > 0) {
      const employeeRecords = employees.map((userId: string) => ({
        office_id: office.id,
        user_id: userId
      }));

      const { error: empError } = await supabase
        .from('office_employees')
        .insert(employeeRecords);

      if (empError) {
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم إنشاء المكتب بنجاح',
      office 
    });

  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// تحديث مكتب
export async function PUT(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { id, name, address, phone, email, latitude, longitude, description, employees } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف المكتب مطلوب' }, { status: 400 });
    }

    // تحديث بيانات المكتب
    const { data: office, error } = await supabase
      .from('offices')
      .update({
        name,
        address,
        phone,
        email,
        latitude,
        longitude,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'فشل في تحديث المكتب' }, { status: 500 });
    }

    // تحديث الموظفين
    if (employees !== undefined) {
      // حذف الموظفين الحاليين
      await supabase
        .from('office_employees')
        .delete()
        .eq('office_id', id);

      // إضافة الموظفين الجدد
      if (employees.length > 0) {
        const employeeRecords = employees.map((userId: string) => ({
          office_id: id,
          user_id: userId
        }));

        const { error: empError } = await supabase
          .from('office_employees')
          .insert(employeeRecords);

        if (empError) {
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم تحديث المكتب بنجاح',
      office 
    });

  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}

// حذف مكتب
export async function DELETE(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المكتب مطلوب' }, { status: 400 });
    }

    // حذف الموظفين من المكتب أولاً
    await supabase
      .from('office_employees')
      .delete()
      .eq('office_id', id);

    // حذف المكتب
    const { error } = await supabase
      .from('offices')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'فشل في حذف المكتب' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'تم حذف المكتب بنجاح'
    });

  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
