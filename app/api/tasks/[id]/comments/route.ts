import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { notifyMention, extractMentions, findUsersByUsernames } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database configuration error');
  }

  return createClient(supabaseUrl, supabaseKey);
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = cookies();
    const adminUserCookie = cookieStore.get('admin_user');
    if (adminUserCookie?.value) {
      // فك تشفير الـ cookie إذا كان مُشفّراً
      const decodedValue = decodeURIComponent(adminUserCookie.value);
      const adminUser = JSON.parse(decodedValue);
      if (adminUser?.id) return adminUser.id;
    }
  } catch (e) {
  }
  return null;
}

// GET /api/tasks/[id]/comments - جلب تعليقات المهمة
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    const supabase = getSupabaseClient();

    const { data: comments, error } = await supabase
      .from('task_comments')
      .select(`
        id,
        task_id,
        content,
        is_edited,
        created_at,
        user:admin_users!task_comments_user_id_fkey(id, name, username, avatar)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    
    // Transform to match UI expectations
    const transformedComments = (comments || []).map((c: any) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      is_edited: c.is_edited || false,
      is_system: c.content?.startsWith('[SYSTEM]') || false,
      user: c.user
    }));

    if (error) {
      return NextResponse.json({ error: 'فشل جلب التعليقات' }, { status: 500 });
    }

    return NextResponse.json({ comments: transformedComments });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/comments - إضافة تعليق جديد
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const taskId = params.id;
    const { content } = await request.json();

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'محتوى التعليق مطلوب' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // إضافة التعليق
    const { data: comment, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: userId,
        content: content.trim()
      })
      .select(`
        id,
        task_id,
        content,
        is_edited,
        created_at,
        user:admin_users!task_comments_user_id_fkey(id, name, username, avatar)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: 'فشل إضافة التعليق' }, { status: 500 });
    }

    // تسجيل النشاط (تجاهل الخطأ إذا لم يكن الجدول موجوداً)
    try {
      await supabase.from('task_activity_log').insert({
        task_id: taskId,
        user_id: userId,
        action: 'commented',
        details: { comment_id: comment.id }
      });
    } catch (e) {
      // تجاهل خطأ سجل النشاط
    }

    // معالجة الإشارات (@mentions)
    try {
      const mentions = extractMentions(content);
      if (mentions.length > 0) {
        const mentionedUsers = await findUsersByUsernames(mentions);
        
        // جلب عنوان المهمة واسم المعلق
        const { data: task } = await supabase
          .from('store_tasks')
          .select('title')
          .eq('id', taskId)
          .single();
        
        const commenterName = (comment.user as any)?.name || 'مستخدم';
        
        // إرسال إشعار لكل مستخدم مذكور (باستثناء المعلق نفسه)
        for (const user of mentionedUsers) {
          if (user.id !== userId) {
            await notifyMention(
              user.id,
              taskId,
              task?.title || 'مهمة',
              commenterName
            );
          }
        }
      }
    } catch (e) {
      // تجاهل خطأ الإشعارات
    }

    // Transform to match UI expectations
    const transformedComment = {
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      is_edited: comment.is_edited || false,
      user: comment.user
    };

    return NextResponse.json({ comment: transformedComment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
