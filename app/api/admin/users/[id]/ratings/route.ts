import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// جلب تقييمات المستخدم
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const userId = params.id;

    const { data: ratings, error } = await supabase
      .from('user_ratings')
      .select(`
        *,
        rater:admin_users!user_ratings_rated_by_fkey(id, name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ratings:', error);
      // إذا كان الجدول غير موجود، نرجع مصفوفة فارغة
      if (error.code === '42P01') {
        return NextResponse.json({ ratings: [] });
      }
      return NextResponse.json({ ratings: [] });
    }

    const formattedRatings = (ratings || []).map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      category: r.category,
      rated_by: r.rated_by,
      rated_by_name: r.rater?.name || 'غير معروف',
      created_at: r.created_at
    }));

    return NextResponse.json({ ratings: formattedRatings });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ ratings: [] });
  }
}

// إضافة تقييم جديد
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const userId = params.id;
    const body = await request.json();
    
    const { rating, comment, category } = body;

    // جلب معلومات المستخدم الحالي من الكوكيز
    const cookieStore = cookies();
    const adminUserCookie = cookieStore.get('admin_user');
    let ratedBy = null;
    
    if (adminUserCookie) {
      try {
        const adminUser = JSON.parse(adminUserCookie.value);
        ratedBy = adminUser.id;
      } catch (e) {
        console.error('Error parsing admin user cookie:', e);
      }
    }

    // التحقق من وجود الجدول وإنشائه إذا لم يكن موجوداً
    const { error: tableError } = await supabase
      .from('user_ratings')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      // الجدول غير موجود - نحتاج إنشائه
      return NextResponse.json({ 
        error: 'جدول التقييمات غير موجود. يرجى إنشاء الجدول في قاعدة البيانات.',
        sql: `
          CREATE TABLE user_ratings (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            category VARCHAR(50) DEFAULT 'general',
            rated_by UUID REFERENCES admin_users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_ratings')
      .insert({
        user_id: userId,
        rating,
        comment: comment || null,
        category: category || 'general',
        rated_by: ratedBy
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating rating:', error);
      return NextResponse.json({ error: 'فشل في إضافة التقييم' }, { status: 500 });
    }

    return NextResponse.json({ success: true, rating: data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
