import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type NotificationType = 'new_store' | 'store_complete' | 'milestone' | 'help_request' | 'help_reply' | 'test';

interface SlackMessage {
  text: string;
  blocks?: any[];
}

// إرسال رسالة إلى Slack
async function sendToSlack(webhookUrl: string, message: SlackMessage): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    return response.ok;
  } catch (error) {
    console.error('Error sending to Slack:', error);
    return false;
  }
}

// إنشاء رسالة Slack منسقة
function createSlackMessage(type: NotificationType, data: any): SlackMessage {
  const emoji = {
    new_store: '🏪',
    store_complete: '🎉',
    milestone: '🎯',
    help_request: '❓',
    help_reply: '💬',
    test: '🔔',
  };

  const titles = {
    new_store: 'متجر جديد سجّل في النظام!',
    store_complete: 'متجر أكمل جميع المهام! 🏆',
    milestone: 'متجر وصل لمرحلة جديدة!',
    help_request: 'طلب مساعدة جديد',
    help_reply: 'تم الرد على طلب مساعدة',
    test: 'رسالة اختبار',
  };

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji[type]} ${titles[type]}`,
        emoji: true,
      },
    },
  ];

  if (type === 'new_store' && data.store_url) {
    blocks.push(
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*المتجر:*\n${data.store_url}` },
          { type: 'mrkdwn', text: `*التاريخ:*\n${new Date().toLocaleDateString('ar-SA')}` },
        ],
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: '📊 يمكنك متابعة تقدم المتجر من لوحة الإدارة' },
        ],
      }
    );
  }

  if (type === 'store_complete' && data.store_url) {
    blocks.push(
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*المتجر:*\n${data.store_url}` },
          { type: 'mrkdwn', text: `*نسبة الإنجاز:*\n100% ✅` },
        ],
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: '🏆 تهانينا! المتجر أكمل جميع المهام بنجاح' },
        ],
      }
    );
  }

  if (type === 'milestone' && data.store_url) {
    blocks.push(
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*المتجر:*\n${data.store_url}` },
          { type: 'mrkdwn', text: `*نسبة الإنجاز:*\n${data.percentage}%` },
        ],
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `🎯 المتجر وصل لمرحلة ${data.percentage}%` },
        ],
      }
    );
  }

  if (type === 'help_request' && data.store_url) {
    blocks.push(
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*المتجر:*\n${data.store_url}` },
          { type: 'mrkdwn', text: `*المهمة:*\n${data.task_title || 'غير محدد'}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*رسالة الطلب:*\n${data.message}` },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: '💬 يرجى الرد على الاستفسار من لوحة الإدارة' },
        ],
      }
    );
  }

  if (type === 'help_reply' && data.store_url) {
    blocks.push(
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*المتجر:*\n${data.store_url}` },
          { type: 'mrkdwn', text: `*المهمة:*\n${data.task_title || 'غير محدد'}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*رسالة الطلب:*\n${data.message}` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*الرد:*\n${data.reply}` },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: '✅ تم الرد على طلب المساعدة' },
        ],
      }
    );
  }

  if (type === 'test') {
    blocks.push(
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '✅ تم ربط Slack بنجاح! الإشعارات تعمل بشكل صحيح.' },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `🕐 ${new Date().toLocaleString('ar-SA')}` },
        ],
      }
    );
  }

  return {
    text: titles[type],
    blocks,
  };
}

// POST - إرسال إشعار
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, webhook_id } = body as { type: NotificationType; data: any; webhook_id?: string };

    if (!type) {
      return NextResponse.json({ error: 'نوع الإشعار مطلوب' }, { status: 400 });
    }

    // جلب webhooks النشطة
    let query = supabase.from('slack_webhooks').select('*').eq('is_active', true);

    // إذا تم تحديد webhook معين
    if (webhook_id) {
      query = query.eq('id', webhook_id);
    }

    const { data: webhooks, error } = await query;

    if (error) throw error;

    if (!webhooks || webhooks.length === 0) {
      return NextResponse.json({ error: 'لا توجد webhooks نشطة' }, { status: 404 });
    }

    const results: { webhook_id: string; success: boolean; error?: string }[] = [];

    for (const webhook of webhooks) {
      // التحقق من إعدادات الإشعارات
      const shouldNotify =
        type === 'test' ||
        (type === 'new_store' && webhook.notify_new_store) ||
        (type === 'store_complete' && webhook.notify_store_complete) ||
        (type === 'milestone' && webhook.notify_milestone) ||
        (type === 'help_request' && webhook.notify_help_request) ||
        (type === 'help_reply' && webhook.notify_help_request);

      if (!shouldNotify) {
        results.push({ webhook_id: webhook.id, success: false, error: 'الإشعار معطل لهذا النوع' });
        continue;
      }

      const message = createSlackMessage(type, data);
      const success = await sendToSlack(webhook.webhook_url, message);

      // تسجيل الإشعار
      await supabase.from('slack_notifications_log').insert({
        webhook_id: webhook.id,
        notification_type: type,
        store_id: data?.store_id || null,
        message: message.text,
        status: success ? 'sent' : 'failed',
        error_message: success ? null : 'فشل في الإرسال',
      });

      results.push({ webhook_id: webhook.id, success });
    }

    const allSuccess = results.every((r) => r.success);
    return NextResponse.json({
      success: allSuccess,
      results,
      message: allSuccess ? 'تم إرسال الإشعار بنجاح' : 'فشل في إرسال بعض الإشعارات',
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ error: 'فشل في إرسال الإشعار' }, { status: 500 });
  }
}
