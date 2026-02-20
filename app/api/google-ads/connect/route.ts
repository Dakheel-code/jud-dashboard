import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateConnection, getCustomerInfo } from '@/lib/google-ads';
import type { GoogleAdsConnection } from '@/types/google-ads';

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const body = await req.json();
    const { store_id, customer_id, client_id, client_secret, refresh_token, developer_token, manager_id } = body;

    if (!store_id || !customer_id || !client_id || !client_secret || !refresh_token || !developer_token) {
      return NextResponse.json({ error: 'جميع الحقول المطلوبة يجب أن تكون موجودة' }, { status: 400 });
    }

    // تنظيف customer_id من الشرطات
    const cleanCustomerId = String(customer_id).replace(/-/g, '');

    const connection: GoogleAdsConnection = {
      id: '',
      store_id,
      customer_id: cleanCustomerId,
      customer_name: null,
      manager_id: manager_id || null,
      client_id,
      client_secret,
      refresh_token,
      developer_token,
      is_active: true,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // التحقق من صحة الاعتمادات
    const isValid = await validateConnection(connection);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Google Ads credentials' }, { status: 400 });
    }

    // جلب اسم الحساب
    const customerInfo = await getCustomerInfo(connection);
    const customerName = customerInfo?.descriptiveName ?? null;

    // حفظ في قاعدة البيانات
    const { error } = await supabase
      .from('google_ads_connections')
      .upsert({
        store_id,
        customer_id: cleanCustomerId,
        customer_name: customerName,
        manager_id: manager_id || null,
        client_id,
        client_secret,
        refresh_token,
        developer_token,
        is_active: true,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'store_id,customer_id' });

    if (error) {
      console.error('Google Ads connect DB error:', error);
      return NextResponse.json({ error: 'فشل في حفظ الاتصال' }, { status: 500 });
    }

    return NextResponse.json({ success: true, customer_name: customerName });
  } catch (e: any) {
    console.error('Google Ads connect error:', e);
    return NextResponse.json({ error: e.message || 'خطأ غير معروف' }, { status: 500 });
  }
}
