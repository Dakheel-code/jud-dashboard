/**
 * Snapchat Ad Accounts - جلب قائمة الحسابات الإعلانية
 * GET /api/integrations/snapchat/ad-accounts?storeId=...
 */

import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/integrations/token-manager';
import { listAdAccounts } from '@/lib/integrations/snapchat';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    // جلب توكن صالح
    const accessToken = await getValidAccessToken(storeId, 'snapchat');

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not connected or token expired', needsReauth: true },
        { status: 401 }
      );
    }

    console.log('=== Fetching Ad Accounts ===', { storeId });

    // جلب الحسابات الإعلانية
    const { adAccounts } = await listAdAccounts({ accessToken });

    console.log('Found ad accounts:', adAccounts.length);

    // إرجاع البيانات بالتنسيق المتوقع من الواجهة
    const formattedAccounts = adAccounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      organization_id: acc.organization_id,
      currency: acc.currency,
      status: acc.status,
    }));

    return NextResponse.json({
      success: true,
      adAccounts: formattedAccounts,
    });
  } catch (error) {
    console.error('Snapchat ad accounts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ad accounts' },
      { status: 500 }
    );
  }
}
