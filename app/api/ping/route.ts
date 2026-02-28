import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/ping — تنبيه الـ Lambda لتقليل Cold Start
export async function GET() {
  return NextResponse.json({ ok: true, t: Date.now() });
}
