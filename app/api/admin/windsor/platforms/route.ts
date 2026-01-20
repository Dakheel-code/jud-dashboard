import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// جلب بيانات المنصات والحملات من Windsor.ai
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.WINDSOR_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Windsor API key not configured' },
        { status: 503 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const datePreset = searchParams.get('date_preset') || 'last_7d';
    const fields = searchParams.get('fields') || 'account_name,campaign,clicks,datasource,date,source,spend';

    // جلب بيانات جميع المنصات من Windsor
    const response = await fetch(
      `https://connectors.windsor.ai/all?api_key=${apiKey}&date_preset=${datePreset}&fields=${fields}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Windsor API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch data from Windsor' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data.data || [],
      count: Array.isArray(data.data) ? data.data.length : 0,
    });
  } catch (error) {
    console.error('❌ Windsor platforms fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
