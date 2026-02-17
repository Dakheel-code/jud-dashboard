import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// جلب قائمة مديري الحسابات
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // جلب المستخدمين الذين لديهم دور مدير حساب (من role أو من مصفوفة roles)
    const { data: allUsers, error } = await supabase
      .from('admin_users')
      .select('id, name, username, email, role, roles')
      .eq('is_active', true)
      .order('name');

    // فلترة المستخدمين الذين لديهم دور account_manager
    const managers = (allUsers || []).filter(user => 
      user.role === 'account_manager' || 
      (user.roles && user.roles.includes('account_manager'))
    );

    if (error) {
      return NextResponse.json({ error: 'فشل جلب مديري الحسابات' }, { status: 500 });
    }

    return NextResponse.json({ managers: managers || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
