/**
 * API: تحديث last_login للمستخدم (heartbeat)
 * POST /api/heartbeat
 * 
 * يُستدعى كل 30 ثانية لتحديث حالة الاتصال
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    // جلب user_id من NextAuth JWT أو من body
    let userId: string | null = null;
    
    // أولاً: جرب من NextAuth JWT
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (token?.uid) {
      userId = token.uid as string;
    }
    
    // ثانياً: جرب من body
    if (!userId) {
      try {
        const body = await request.json();
        userId = body.userId;
      } catch {
        // ignore
      }
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const supabase = getSupabaseClient();
    
    // تحديث last_login
    const { error } = await supabase
      .from('admin_users')
      .update({ 
        last_login: new Date().toISOString(),
      })
      .eq('id', userId);
    
    if (error) {
      console.error('Heartbeat error:', error);
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
