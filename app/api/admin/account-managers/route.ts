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

    // جلب المستخدمين الذين لديهم دور مدير حساب فقط
    const { data: managers, error } = await supabase
      .from('admin_users')
      .select('id, name, username, email, role')
      .eq('is_active', true)
      .eq('role', 'account_manager')
      .order('name');

    if (error) {
      console.error('❌ Fetch account managers error:', error);
      return NextResponse.json({ error: 'فشل جلب مديري الحسابات' }, { status: 500 });
    }

    return NextResponse.json({ managers: managers || [] });
  } catch (error) {
    console.error('❌ GET account managers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
