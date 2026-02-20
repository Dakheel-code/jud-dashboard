import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    client_id:       process.env.GOOGLE_ADS_CLIENT_ID       ?? '',
    client_secret:   process.env.GOOGLE_ADS_CLIENT_SECRET    ?? '',
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN  ?? '',
    refresh_token:   process.env.GOOGLE_ADS_REFRESH_TOKEN    ?? '',
    manager_id:      process.env.GOOGLE_ADS_MANAGER_ID       ?? '',
  });
}
