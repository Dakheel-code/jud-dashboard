/**
 * API: معالجة التذكيرات (Cron Job)
 * GET /api/cron/reminders
 * 
 * يُستدعى كل دقيقة من Vercel Cron أو خدمة خارجية
 * 
 * Headers المطلوبة:
 * - Authorization: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { processAllReminders, cleanupOldReminders } from '@/lib/meetings/reminder-service';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // التحقق من المصادقة
    const authHeader = request.headers.get('authorization');
    
    if (CRON_SECRET) {
      if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json(
          { error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
    }

    const startTime = Date.now();

    // معالجة التذكيرات
    const results = await processAllReminders();

    // تنظيف السجلات القديمة (مرة واحدة كل ساعة تقريباً)
    let cleanedUp = 0;
    const currentMinute = new Date().getMinutes();
    if (currentMinute === 0) {
      cleanedUp = await cleanupOldReminders();
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      results: {
        reminders_24h: results.reminders_24h,
        reminders_10min: results.reminders_10min,
        cleaned_up: cleanedUp,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal error', 
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// دعم POST أيضاً للمرونة
export async function POST(request: NextRequest) {
  return GET(request);
}
