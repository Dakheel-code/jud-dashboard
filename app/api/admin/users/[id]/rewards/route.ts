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

// جلب مكافآت المستخدم
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const userId = params.id;

    const { data: rewards, error } = await supabase
      .from('user_rewards')
      .select(`
        *,
        awarder:admin_users!user_rewards_awarded_by_fkey(id, name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rewards:', error);
      // إذا كان الجدول غير موجود، نرجع مصفوفة فارغة
      if (error.code === '42P01') {
        return NextResponse.json({ rewards: [], totalPoints: 0 });
      }
      return NextResponse.json({ rewards: [], totalPoints: 0 });
    }

    const formattedRewards = (rewards || []).map(r => ({
      id: r.id,
      title: r.title,
      points: r.points,
      description: r.description,
      type: r.type,
      awarded_by: r.awarded_by,
      awarded_by_name: r.awarder?.name || 'غير معروف',
      created_at: r.created_at
    }));

    const totalPoints = formattedRewards.reduce((sum, r) => sum + (r.points || 0), 0);

    return NextResponse.json({ rewards: formattedRewards, totalPoints });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ rewards: [], totalPoints: 0 });
  }
}

// إضافة مكافأة جديدة
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const userId = params.id;
    const body = await request.json();
    
    const { title, points, description, type } = body;

    // جلب معلومات المستخدم الحالي من الكوكيز
    const cookieStore = cookies();
    const adminUserCookie = cookieStore.get('admin_user');
    let awardedBy = null;
    
    if (adminUserCookie) {
      try {
        const adminUser = JSON.parse(adminUserCookie.value);
        awardedBy = adminUser.id;
      } catch (e) {
        console.error('Error parsing admin user cookie:', e);
      }
    }

    // التحقق من وجود الجدول
    const { error: tableError } = await supabase
      .from('user_rewards')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      return NextResponse.json({ 
        error: 'جدول المكافآت غير موجود. يرجى إنشاء الجدول في قاعدة البيانات.',
        sql: `
          CREATE TABLE user_rewards (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            points INTEGER NOT NULL DEFAULT 0,
            description TEXT,
            type VARCHAR(50) DEFAULT 'recognition',
            awarded_by UUID REFERENCES admin_users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_rewards')
      .insert({
        user_id: userId,
        title,
        points: points || 0,
        description: description || null,
        type: type || 'recognition',
        awarded_by: awardedBy
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reward:', error);
      return NextResponse.json({ error: 'فشل في إضافة المكافأة' }, { status: 500 });
    }

    return NextResponse.json({ success: true, reward: data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'حدث خطأ' }, { status: 500 });
  }
}
