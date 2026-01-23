import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'task-attachments';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

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
      const adminUser = JSON.parse(adminUserCookie.value);
      if (adminUser?.id) return adminUser.id;
    }
  } catch (e) {
    console.log('Cookie parsing failed');
  }
  return null;
}

// تنظيف اسم الملف ليكون آمناً للتخزين
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100);
}

// GET /api/tasks/[id]/attachments - جلب مرفقات المهمة
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;
    const supabase = getSupabaseClient();

    const { data: attachments, error } = await supabase
      .from('task_attachments')
      .select(`
        id,
        task_id,
        file_path,
        file_name,
        file_size,
        mime_type,
        created_at,
        uploader:admin_users!task_attachments_uploader_id_fkey(id, name, username, avatar)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching attachments:', error);
      return NextResponse.json({ error: 'فشل جلب المرفقات' }, { status: 500 });
    }

    // إنشاء signed URLs لكل مرفق
    const attachmentsWithUrls = await Promise.all(
      (attachments || []).map(async (att) => {
        let signedUrl = null;
        if (att.file_path) {
          const { data } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(att.file_path, 3600); // 1 hour expiry
          signedUrl = data?.signedUrl || null;
        }
        return {
          ...att,
          user: att.uploader,
          file_url: signedUrl
        };
      })
    );

    return NextResponse.json({ attachments: attachmentsWithUrls });
  } catch (error) {
    console.error('GET attachments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/tasks/[id]/attachments - إضافة مرفق جديد
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
    const { file_name, file_data, mime_type, file_size } = await request.json();

    if (!file_name) {
      return NextResponse.json({ error: 'اسم الملف مطلوب' }, { status: 400 });
    }

    if (file_size && file_size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'حجم الملف يجب أن يكون أقل من 25 ميجابايت' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // إنشاء معرف فريد للمرفق
    const attachmentId = crypto.randomUUID();
    const safeFileName = sanitizeFileName(file_name);
    
    // مسار الملف: {task_id}/{attachment_id}-{safeFileName}
    const filePath = `${taskId}/${attachmentId}-${safeFileName}`;

    // رفع الملف إلى Storage (إذا كان هناك بيانات)
    if (file_data) {
      // تحويل base64 إلى buffer
      const base64Data = file_data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, buffer, {
          contentType: mime_type || 'application/octet-stream',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        return NextResponse.json({ error: 'فشل رفع الملف' }, { status: 500 });
      }
    }

    // إضافة المرفق في قاعدة البيانات
    const { data: attachment, error } = await supabase
      .from('task_attachments')
      .insert({
        id: attachmentId,
        task_id: taskId,
        uploader_id: userId,
        file_path: filePath,
        file_name: file_name,
        file_size: file_size || null,
        mime_type: mime_type || null
      })
      .select(`
        id,
        task_id,
        file_path,
        file_name,
        file_size,
        mime_type,
        created_at,
        uploader:admin_users!task_attachments_uploader_id_fkey(id, name, username, avatar)
      `)
      .single();

    if (error) {
      console.error('Error creating attachment record:', error);
      // حذف الملف من Storage إذا فشل إنشاء السجل
      if (file_data) {
        await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      }
      return NextResponse.json({ error: 'فشل إضافة المرفق' }, { status: 500 });
    }

    // إنشاء signed URL
    let signedUrl = null;
    if (attachment.file_path) {
      const { data } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(attachment.file_path, 3600);
      signedUrl = data?.signedUrl || null;
    }

    // تسجيل النشاط
    try {
      await supabase.from('task_activity_log').insert({
        task_id: taskId,
        user_id: userId,
        action: 'attached',
        details: { attachment_id: attachment.id, file_name }
      });
    } catch (e) {
      // تجاهل خطأ سجل النشاط
    }

    return NextResponse.json({ 
      attachment: {
        ...attachment,
        user: attachment.uploader,
        file_url: signedUrl
      }
    }, { status: 201 });
  } catch (error) {
    console.error('POST attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]/attachments - حذف مرفق
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const attachmentId = searchParams.get('attachment_id');

    if (!attachmentId) {
      return NextResponse.json({ error: 'معرف المرفق مطلوب' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // التحقق من ملكية المرفق
    const { data: attachment } = await supabase
      .from('task_attachments')
      .select('uploader_id, file_path')
      .eq('id', attachmentId)
      .single();

    if (!attachment) {
      return NextResponse.json({ error: 'المرفق غير موجود' }, { status: 404 });
    }

    // التحقق من الصلاحية
    const { data: user } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', userId)
      .single();

    const isAdmin = ['super_admin', 'admin'].includes(user?.role || '');
    const isManager = ['super_admin', 'admin', 'team_leader', 'manager'].includes(user?.role || '');

    // DELETE: allowed if uploader_id = current user OR is_admin() OR is_manager()
    if (attachment.uploader_id !== userId && !isAdmin && !isManager) {
      return NextResponse.json({ error: 'غير مصرح بحذف هذا المرفق' }, { status: 403 });
    }

    // حذف الملف من Storage إذا كان موجوداً
    if (attachment.file_path) {
      await supabase.storage
        .from(BUCKET_NAME)
        .remove([attachment.file_path]);
    }

    // حذف المرفق من قاعدة البيانات
    const { error } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) {
      console.error('Error deleting attachment:', error);
      return NextResponse.json({ error: 'فشل حذف المرفق' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
