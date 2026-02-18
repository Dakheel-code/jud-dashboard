/**
 * Audit Log — سجل تدقيق إلزامي
 * يسجل كل العمليات الحساسة في admin_audit_logs
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export interface AuditEntry {
  user_id: string | null;
  action: string;          // e.g. "auth.login", "users.update", "roles.update"
  entity?: string;         // e.g. "admin_users", "admin_roles"
  entity_id?: string;
  meta?: Record<string, any>;
  ip?: string;
  user_agent?: string;
}

/**
 * تسجيل عملية في سجل التدقيق
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase.from('admin_audit_logs').insert({
      user_id: entry.user_id,
      action: entry.action,
      entity: entry.entity || null,
      entity_id: entry.entity_id || null,
      meta: entry.meta || {},
      ip: entry.ip || null,
      user_agent: entry.user_agent || null,
    });
  } catch {
    // لا نوقف العملية الأصلية إذا فشل التسجيل
  }
}

/**
 * استخراج IP و User-Agent من الطلب
 */
export function extractRequestInfo(request: NextRequest | Request): { ip: string; user_agent: string } {
  const headers = request.headers;
  return {
    ip: headers.get('x-forwarded-for') || headers.get('x-real-ip') || 'unknown',
    user_agent: headers.get('user-agent') || 'unknown',
  };
}

/**
 * تسجيل عملية مع استخراج معلومات الطلب تلقائياً
 */
export async function logAuditFromRequest(
  request: NextRequest | Request,
  userId: string | null,
  action: string,
  opts?: { entity?: string; entity_id?: string; meta?: Record<string, any> }
): Promise<void> {
  const { ip, user_agent } = extractRequestInfo(request);
  await logAudit({
    user_id: userId,
    action,
    entity: opts?.entity,
    entity_id: opts?.entity_id,
    meta: opts?.meta,
    ip,
    user_agent,
  });
}
