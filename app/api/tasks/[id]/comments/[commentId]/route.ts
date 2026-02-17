import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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
    const cookieStore = await cookies();
    const adminUserCookie = cookieStore.get('admin_user');
    if (adminUserCookie?.value) {
      const adminUser = JSON.parse(adminUserCookie.value);
      if (adminUser?.id) return adminUser.id;
    }
  } catch (e) {
  }
  return null;
}

async function getUserRole(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('admin_users')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role || null;
}

// PUT /api/tasks/[id]/comments/[commentId] - تعديل تعليق
export async function PUT(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { content } = await request.json();
    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'محتوى التعليق مطلوب' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // التحقق من ملكية التعليق أو صلاحية الأدمن
    const { data: comment } = await supabase
      .from('task_comments')
      .select('user_id')
      .eq('id', params.commentId)
      .single();

    if (!comment) {
      return NextResponse.json({ error: 'التعليق غير موجود' }, { status: 404 });
    }

    const userRole = await getUserRole(supabase, userId);
    const isAdmin = ['super_admin', 'admin'].includes(userRole || '');
    const isManager = ['super_admin', 'admin', 'team_leader', 'manager'].includes(userRole || '');

    // Only admins/managers can update (as per Phase 1 spec)
    if (!isAdmin && !isManager) {
      return NextResponse.json({ error: 'غير مصرح بتعديل التعليقات' }, { status: 403 });
    }

    // تحديث التعليق
    const { data: updatedComment, error } = await supabase
      .from('task_comments')
      .update({
        content: content.trim(),
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.commentId)
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
      return NextResponse.json({ error: 'فشل تعديل التعليق' }, { status: 500 });
    }

    // Transform to match UI expectations
    const transformedComment = {
      id: updatedComment.id,
      content: updatedComment.content,
      created_at: updatedComment.created_at,
      is_edited: updatedComment.is_edited,
      user: updatedComment.user
    };

    return NextResponse.json({ comment: transformedComment });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]/comments/[commentId] - حذف تعليق
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    // التحقق من ملكية التعليق أو صلاحية الأدمن/المدير
    const { data: comment } = await supabase
      .from('task_comments')
      .select('user_id')
      .eq('id', params.commentId)
      .single();

    if (!comment) {
      return NextResponse.json({ error: 'التعليق غير موجود' }, { status: 404 });
    }

    const userRole = await getUserRole(supabase, userId);
    const isAdmin = ['super_admin', 'admin'].includes(userRole || '');
    const isManager = ['super_admin', 'admin', 'team_leader', 'manager'].includes(userRole || '');

    // DELETE: allowed if user_id = current user OR is_admin() OR is_manager()
    if (comment.user_id !== userId && !isAdmin && !isManager) {
      return NextResponse.json({ error: 'غير مصرح بحذف هذا التعليق' }, { status: 403 });
    }

    // حذف التعليق
    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', params.commentId);

    if (error) {
      return NextResponse.json({ error: 'فشل حذف التعليق' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
