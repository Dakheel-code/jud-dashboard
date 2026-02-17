import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Database configuration error');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// جلب بيانات الحملات من Windsor للمتجر
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = process.env.WINDSOR_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Windsor API key not configured' },
        { status: 503 }
      );
    }

    const storeId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const datePreset = searchParams.get('date_preset') || 'last_7d';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const supabase = getSupabaseClient();

    // جلب بيانات المتجر للحصول على أسماء الحسابات المرتبطة
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, store_name, store_url, snapchat_account, tiktok_account, google_account, meta_account')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // بناء معاملات التاريخ
    let dateParams = '';
    if (datePreset === 'custom' && startDate && endDate) {
      dateParams = `start_date=${startDate}&end_date=${endDate}`;
    } else {
      dateParams = `date_preset=${datePreset}`;
    }

    // جلب بيانات من Windsor - الحقول الأساسية فقط (بدون image_url لتجنب خطأ 500)
    const windsorResponse = await fetch(
      `https://connectors.windsor.ai/all?api_key=${apiKey}&${dateParams}&fields=account_name,ad_id,ad_name,campaign,clicks,conversions,datasource,date,impressions,roas,source,spend`,
      {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      }
    );

    if (!windsorResponse.ok) {
      const errorText = await windsorResponse.text();
      return NextResponse.json(
        { error: 'Failed to fetch data from Windsor', details: errorText },
        { status: windsorResponse.status }
      );
    }

    const windsorData = await windsorResponse.json();
    const allData = windsorData.data || [];

    // فلترة البيانات حسب الحسابات المرتبطة بالمتجر
    const linkedAccounts = [
      store.snapchat_account,
      store.tiktok_account,
      store.google_account,
      store.meta_account,
    ].filter(Boolean);


    // إذا لم يكن هناك حسابات مرتبطة، أرجع فارغ
    if (linkedAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        summary: { sales: 0, revenue: 0, spend: 0, clicks: 0, impressions: 0, roas: 0 },
        linkedAccounts: [],
        message: 'لا توجد حسابات إعلانية مرتبطة بهذا المتجر'
      });
    }

    // للتشخيص
    const uniqueWindsorAccounts = [...new Set(allData.map((d: any) => d.account_name))];

    // طباعة جميع أسماء الحسابات في Windsor للتشخيص
    const allAccountNames = [...new Set(allData.map((d: any) => d.account_name))];
    
    // طباعة جميع الـ datasources المتاحة
    const allDatasources = [...new Set(allData.map((d: any) => d.datasource))];
    
    // طباعة الحسابات مع المنصات
    const accountsWithPlatforms = [...new Set(allData.map((d: any) => `${d.account_name} (${d.datasource})`))];
    
    // فلترة البيانات - مطابقة account_name مع الحسابات المرتبطة
    
    // طباعة أول 10 حسابات من Windsor للتشخيص
    const sampleAccounts = allData.slice(0, 10).map((d: any) => `${d.account_name} (${d.datasource})`);
    
    const filteredData = allData.filter((item: any) => {
      const accountName = (item.account_name || '').trim().toLowerCase();
      return linkedAccounts.some(acc => {
        const linkedAcc = (acc || '').trim().toLowerCase();
        if (!linkedAcc) return false;
        
        // مطابقة مرنة - تشمل المطابقة الجزئية والترجمة
        // Kadra = كادرا (نفس الحساب بلغتين مختلفتين)
        const kadraVariants = ['kadra', 'كادرا', 'قادرا', 'كدرا'];
        const isKadraMatch = kadraVariants.includes(accountName) && kadraVariants.includes(linkedAcc);
        
        const match = accountName === linkedAcc || 
               accountName.includes(linkedAcc) || 
               linkedAcc.includes(accountName) ||
               isKadraMatch;
        if (match) {
        }
        return match;
      });
    });
    
    // إذا لم يتم العثور على بيانات، إرجاع قائمة الحسابات المتاحة
    if (filteredData.length === 0) {
      const uniqueNames = [...new Set(allData.map((d: any) => d.account_name))];
      uniqueNames.forEach(name => console.log(`  - "${name}"`));
      
      // إرجاع استجابة مع قائمة الحسابات المتاحة للمساعدة في الربط الصحيح
      return NextResponse.json({
        success: true,
        data: [],
        summary: { sales: 0, revenue: 0, spend: 0, clicks: 0, impressions: 0, roas: 0 },
        byPlatform: {},
        linkedAccounts,
        storeName: store.store_name,
        count: 0,
        message: 'لم يتم العثور على بيانات مطابقة. تأكد من أن اسم الحساب المرتبط يطابق اسم الحساب في Windsor.',
        availableAccounts: accountsWithPlatforms,
        debug: {
          storeAccounts: {
            snapchat: store.snapchat_account,
            tiktok: store.tiktok_account,
            meta: store.meta_account,
            google: store.google_account
          },
          windsorAccounts: uniqueNames,
          availableDatasources: allDatasources,
          accountsWithPlatforms
        }
      });
    }
    
    
    // طباعة عينة من البيانات لمعرفة الحقول المتاحة
    if (filteredData.length > 0) {
    }

    // حساب الإحصائيات - استخدام حقول بديلة إذا كانت الأصلية null
    const summary = filteredData.reduce((acc: any, item: any) => {
      acc.spend += item.spend || 0;
      acc.clicks += item.clicks || 0;
      acc.impressions += item.impressions || 0;
      // استخدام حقول بديلة للمبيعات
      acc.conversions += item.conversions || item.purchases || item.purchase || item.total_conversions || 0;
      // استخدام حقول بديلة للإيرادات
      acc.revenue += item.revenue || item.purchase_value || item.total_conversion_value || 0;
      return acc;
    }, { spend: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0 });

    // حساب ROAS
    summary.roas = summary.spend > 0 ? (summary.revenue / summary.spend).toFixed(2) : 0;

    // تجميع حسب المنصة مع توحيد الأسماء
    const normalizePlatform = (datasource: string): string => {
      const ds = (datasource || '').toLowerCase();
      // Snapchat قد يكون snapchat أو snapchat_marketing
      if (ds === 'snapchat' || ds === 'snapchat_marketing' || ds.startsWith('snap')) return 'snapchat';
      if (ds === 'tiktok' || ds === 'tiktok_ads' || ds.startsWith('tik')) return 'tiktok';
      if (ds === 'facebook' || ds === 'instagram' || ds === 'meta' || ds === 'facebook_ads') return 'facebook';
      if (ds === 'google_ads' || ds === 'google' || ds === 'adwords') return 'google_ads';
      return datasource;
    };
    
    filteredData.forEach((item: any) => {
    });
    
    const byPlatform = filteredData.reduce((acc: any, item: any) => {
      const platform = normalizePlatform(item.datasource);
      if (!acc[platform]) {
        acc[platform] = { spend: 0, clicks: 0, impressions: 0, conversions: 0, revenue: 0, records: [] };
      }
      acc[platform].spend += item.spend || 0;
      acc[platform].clicks += item.clicks || 0;
      acc[platform].impressions += item.impressions || 0;
      acc[platform].conversions += item.conversions || 0;
      acc[platform].revenue += item.revenue || 0;
      acc[platform].records.push(item);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: filteredData,
      summary,
      byPlatform,
      linkedAccounts,
      storeName: store.store_name,
      count: filteredData.length,
      // للتشخيص
      debug: {
        storeAccounts: store,
        windsorAccountsCount: uniqueWindsorAccounts.length,
        windsorAccounts: uniqueWindsorAccounts,
        totalWindsorRecords: allData.length,
        availableDatasources: allDatasources,
        accountsWithPlatforms: accountsWithPlatforms
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
