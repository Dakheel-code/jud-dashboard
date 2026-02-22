import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// تشخيص مؤقت
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const { id } = params;
    const { data, error } = await supabase.from('announcements').select('id,status').eq('id', id).single();
    return NextResponse.json({ id, data, error, env_service: !!process.env.SUPABASE_SERVICE_ROLE_KEY, env_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL });
  } catch (e: any) {
    return NextResponse.json({ catch_error: e?.message });
  }
}

// إرسال تعميم
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseClient();
    const { id } = params;

    // جلب التعميم
    const { data: announcement, error: fetchError } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !announcement) {
      return NextResponse.json({ error: 'التعميم غير موجود' }, { status: 404 });
    }

    // تحديد المستخدمين المستهدفين
    let usersToNotify: string[] = [];

    if (announcement.target_type === 'all') {
      const { data: users } = await supabase
        .from('admin_users')
        .select('id');
      usersToNotify = users?.map((u: any) => u.id) || [];
    } else if (announcement.target_type === 'department' && announcement.target_department_id) {
      const { data: users } = await supabase
        .from('admin_users')
        .select('id')
        .eq('department_id', announcement.target_department_id);
      usersToNotify = users?.map((u: any) => u.id) || [];
    } else if (announcement.target_type === 'users') {
      const { data: targetUsers } = await supabase
        .from('announcement_target_users')
        .select('user_id')
        .eq('announcement_id', id);
      usersToNotify = targetUsers?.map((t: any) => t.user_id) || [];
    }

    // حذف سجلات القراءة القديمة وإعادة إنشائها (لدعم إعادة النشر)
    await supabase.from('announcement_reads').delete().eq('announcement_id', id);

    // إنشاء سجلات القراءة الجديدة
    if (usersToNotify.length > 0) {
      const readRecords = usersToNotify.map(userId => ({
        announcement_id: id,
        user_id: userId,
        read_at: null
      }));

      const { error: readsError } = await supabase
        .from('announcement_reads')
        .upsert(readRecords, { onConflict: 'announcement_id,user_id', ignoreDuplicates: false });

      if (readsError) {
        console.error('reads error:', readsError);
      }
    }

    // تحديث وقت الإرسال (sent_at هو المؤشر الوحيد للإرسال)
    const { error: updateError } = await supabase
      .from('announcements')
      .update({ sent_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: 'فشل في تحديث حالة التعميم', detail: updateError.message, code: updateError.code }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `تم إرسال التعميم إلى ${usersToNotify.length} مستخدم`,
      recipients_count: usersToNotify.length
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'حدث خطأ', detail: error?.message }, { status: 500 });
  }
}
