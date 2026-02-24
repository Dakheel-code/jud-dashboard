import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const clientId      = process.env.GOOGLE_ADS_CLIENT_ID       || '';
  const clientSecret  = process.env.GOOGLE_ADS_CLIENT_SECRET   || '';
  const refreshToken  = process.env.GOOGLE_ADS_REFRESH_TOKEN   || '';
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';
  const managerId    = process.env.GOOGLE_ADS_MANAGER_ID       || '';

  // اختبار جلب access token
  let tokenResult: any = null;
  let tokenError: any = null;
  try {
    const body = new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });
    const res = await fetch('https://www.googleapis.com/oauth2/v3/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const data = await res.json();
    if (res.ok) {
      tokenResult = { ok: true, token_prefix: data.access_token?.slice(0, 20) + '...' };
    } else {
      tokenError = data;
    }
  } catch (e: any) {
    tokenError = e.message;
  }

  return NextResponse.json({
    env: {
      client_id_set:       !!clientId,
      client_secret_set:   !!clientSecret,
      refresh_token_set:   !!refreshToken,
      developer_token_set: !!developerToken,
      manager_id:          managerId || '(فارغ)',
      client_id_prefix:    clientId.slice(0, 15) + '...',
      refresh_token_prefix: refreshToken.slice(0, 20) + '...',
    },
    token_result: tokenResult,
    token_error:  tokenError,
  });
}
