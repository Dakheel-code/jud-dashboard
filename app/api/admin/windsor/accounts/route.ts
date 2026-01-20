import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// جلب حسابات Windsor حسب المنصة
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
    const datasource = searchParams.get('datasource'); // snapchat, facebook, tiktok, google_ads

    // جلب بيانات من Windsor - نفس الحقول المستخدمة في صفحة Windsor
    const response = await fetch(
      `https://connectors.windsor.ai/all?api_key=${apiKey}&date_preset=last_30d&fields=account_name,campaign,clicks,datasource,date,source,spend`,
      {
        headers: { 'Content-Type': 'application/json' },
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
    const allData = data.data || [];
    
    // للتشخيص: طباعة المنصات المتاحة
    const availableDatasources = [...new Set(allData.map((item: any) => item.datasource))];
    console.log('Available datasources in Windsor:', availableDatasources);
    console.log('Total records from Windsor:', allData.length);

    // استخراج الحسابات الفريدة
    const accountsMap = new Map<string, { account_name: string; datasource: string }>();
    
    allData.forEach((item: any) => {
      const key = `${item.datasource}-${item.account_name}`;
      if (!accountsMap.has(key) && item.account_name) {
        accountsMap.set(key, {
          account_name: item.account_name,
          datasource: item.datasource
        });
      }
    });

    let accounts = Array.from(accountsMap.values());

    // فلترة حسب المنصة إذا تم تحديدها
    if (datasource) {
      const datasourceMap: { [key: string]: string[] } = {
        'snapchat': ['snapchat', 'snap', 'snapchat_marketing'],
        'tiktok': ['tiktok', 'tik_tok', 'tiktok_ads'],
        'facebook': ['facebook', 'instagram', 'meta', 'fb', 'facebook_ads'],
        'google_ads': ['google_ads', 'google', 'adwords', 'googleads']
      };
      
      const allowedSources = datasourceMap[datasource] || [datasource];
      console.log('Filtering by datasource:', datasource, 'allowed:', allowedSources);
      accounts = accounts.filter(acc => {
        const match = allowedSources.some(src => acc.datasource?.toLowerCase().includes(src));
        console.log(`Account ${acc.account_name} (${acc.datasource}): ${match ? 'MATCH' : 'NO MATCH'}`);
        return match;
      });
    }

    // تجميع حسب المنصة
    const byPlatform = accounts.reduce((acc: any, item) => {
      const platform = item.datasource || 'unknown';
      if (!acc[platform]) {
        acc[platform] = [];
      }
      acc[platform].push(item.account_name);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      accounts,
      byPlatform,
      count: accounts.length,
      availableDatasources,
      totalRecords: allData.length
    });
  } catch (error) {
    console.error('❌ Windsor accounts fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
