import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - جلب جميع webhooks
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('slack_webhooks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ webhooks: data });
  } catch (error) {
    return NextResponse.json({ error: 'فشل في جلب الإعدادات' }, { status: 500 });
  }
}

// POST - إضافة webhook جديد
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, webhook_url, channel_name, notify_new_store, notify_store_complete, notify_milestone, notify_help_request } = body;

    if (!name || !webhook_url) {
      return NextResponse.json({ error: 'الاسم ورابط Webhook مطلوبان' }, { status: 400 });
    }

    // التحقق من صحة رابط Webhook
    if (!webhook_url.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json({ error: 'رابط Webhook غير صالح' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('slack_webhooks')
      .insert({
        name,
        webhook_url,
        channel_name,
        notify_new_store: notify_new_store ?? true,
        notify_store_complete: notify_store_complete ?? true,
        notify_milestone: notify_milestone ?? true,
        notify_help_request: notify_help_request ?? true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ webhook: data, message: 'تم إضافة Webhook بنجاح' });
  } catch (error) {
    return NextResponse.json({ error: 'فشل في إضافة Webhook' }, { status: 500 });
  }
}

// PUT - تحديث webhook
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف Webhook مطلوب' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('slack_webhooks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ webhook: data, message: 'تم تحديث Webhook بنجاح' });
  } catch (error) {
    return NextResponse.json({ error: 'فشل في تحديث Webhook' }, { status: 500 });
  }
}

// DELETE - حذف webhook
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف Webhook مطلوب' }, { status: 400 });
    }

    const { error } = await supabase
      .from('slack_webhooks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'تم حذف Webhook بنجاح' });
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حذف Webhook' }, { status: 500 });
  }
}
