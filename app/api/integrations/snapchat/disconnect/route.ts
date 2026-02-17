/**
 * Snapchat Disconnect - فصل الربط
 * POST /api/integrations/snapchat/disconnect
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearTokens } from '@/lib/integrations/token-manager';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId } = body;

    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    // حذف التوكنات وفصل الربط
    await clearTokens(storeId, 'snapchat');

    return NextResponse.json({
      success: true,
      message: 'Snapchat disconnected successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to disconnect Snapchat' },
      { status: 500 }
    );
  }
}
