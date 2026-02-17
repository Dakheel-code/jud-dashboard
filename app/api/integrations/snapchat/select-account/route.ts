/**
 * Snapchat Select Ad Account - حفظ الحساب الإعلاني المختار
 * POST /api/integrations/snapchat/select-account
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateSelectedAdAccount } from '@/lib/integrations/token-manager';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, ad_account_id, ad_account_name, organization_id } = body;


    if (!storeId || !ad_account_id || !ad_account_name) {
      return NextResponse.json(
        { error: 'storeId, ad_account_id, and ad_account_name are required' },
        { status: 400 }
      );
    }

    // تحديث الحساب الإعلاني المختار
    await updateSelectedAdAccount(storeId, 'snapchat', {
      id: ad_account_id,
      name: ad_account_name,
      organizationId: organization_id,
    });


    return NextResponse.json({
      success: true,
      message: 'Ad account selected successfully',
      redirect: `/admin/store/${storeId}`,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to select ad account' 
      },
      { status: 500 }
    );
  }
}
