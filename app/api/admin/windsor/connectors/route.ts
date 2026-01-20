import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// جلب قائمة جميع الموصلات المتاحة من Windsor.ai
export async function GET() {
  try {
    // جلب قائمة الموصلات المتاحة (لا تحتاج API key)
    const response = await fetch(
      'https://connectors.windsor.ai/list_connectors',
      {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Windsor connectors API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch connectors from Windsor' },
        { status: response.status }
      );
    }

    const connectors = await response.json();

    return NextResponse.json({
      success: true,
      connectors: connectors || [],
      count: Array.isArray(connectors) ? connectors.length : 0,
    });
  } catch (error) {
    console.error('❌ Windsor connectors fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
