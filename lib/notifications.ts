import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Database configuration error');
  return createClient(url, key);
}

export type NotificationType = 'reassign' | 'help_request' | 'help_response' | 'mention' | 'comment' | 'task_update';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, any>;
}

export async function createNotification(params: CreateNotificationParams): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase.from('notifications').insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body || null,
      link: params.link || null,
      metadata: params.metadata || {}
    });

    if (error) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

// إشعار عند تحويل المهمة
export async function notifyReassign(
  newAssigneeId: string,
  taskId: string,
  taskTitle: string,
  fromUserName: string
): Promise<void> {
  await createNotification({
    userId: newAssigneeId,
    type: 'reassign',
    title: 'تم تحويل مهمة إليك',
    body: `تم تحويل المهمة "${taskTitle}" إليك من ${fromUserName}`,
    link: `/tasks/${taskId}`
  });
}

// إشعار عند طلب المساعدة
export async function notifyHelpRequest(
  helperId: string,
  taskId: string,
  taskTitle: string,
  requesterName: string,
  message?: string
): Promise<void> {
  await createNotification({
    userId: helperId,
    type: 'help_request',
    title: 'طلب مساعدة جديد',
    body: `${requesterName} يطلب مساعدتك في المهمة "${taskTitle}"${message ? `: ${message}` : ''}`,
    link: `/tasks/${taskId}`
  });
}

// إشعار عند الرد على طلب المساعدة
export async function notifyHelpResponse(
  requesterId: string,
  taskId: string,
  taskTitle: string,
  helperName: string,
  accepted: boolean
): Promise<void> {
  await createNotification({
    userId: requesterId,
    type: 'help_response',
    title: accepted ? 'تم قبول طلب المساعدة' : 'تم رفض طلب المساعدة',
    body: `${helperName} ${accepted ? 'قبل' : 'رفض'} طلب المساعدة في المهمة "${taskTitle}"`,
    link: `/tasks/${taskId}`
  });
}

// إشعار عند الإشارة في تعليق
export async function notifyMention(
  mentionedUserId: string,
  taskId: string,
  taskTitle: string,
  commenterName: string
): Promise<void> {
  await createNotification({
    userId: mentionedUserId,
    type: 'mention',
    title: 'تم الإشارة إليك',
    body: `${commenterName} أشار إليك في تعليق على المهمة "${taskTitle}"`,
    link: `/tasks/${taskId}`
  });
}

// استخراج الإشارات من النص (@username)
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex);
  if (!matches) return [];
  return matches.map(m => m.slice(1)); // إزالة @
}

// البحث عن المستخدمين بناءً على usernames
export async function findUsersByUsernames(usernames: string[]): Promise<{ id: string; username: string }[]> {
  if (usernames.length === 0) return [];
  
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, username')
      .in('username', usernames);
    
    if (error) {
      return [];
    }
    
    return data || [];
  } catch (e) {
    return [];
  }
}
