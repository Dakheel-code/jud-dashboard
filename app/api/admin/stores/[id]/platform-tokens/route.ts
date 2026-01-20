import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DATA_FILE = path.join(process.cwd(), 'data', 'platform-tokens.json');

// التأكد من وجود مجلد data
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// قراءة البيانات من الملف المحلي
function readLocalData(): { [storeId: string]: { [platform: string]: { accessToken: string; accountId: string; connectedAt: string } } } {
  ensureDataDir();
  if (fs.existsSync(DATA_FILE)) {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  }
  return {};
}

// كتابة البيانات للملف المحلي
function writeLocalData(data: any) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// GET - جلب tokens المنصات لمتجر معين
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id;

    // محاولة استخدام Supabase أولاً
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data, error } = await supabase
        .from('store_platform_tokens')
        .select('*')
        .eq('store_id', storeId);

      if (!error && data) {
        const tokens: { [key: string]: any } = {};
        data.forEach((item: any) => {
          tokens[item.platform] = {
            accessToken: item.access_token,
            accountId: item.account_id,
            connectedAt: item.connected_at
          };
        });
        return NextResponse.json({ tokens });
      }
    }

    // Fallback للملف المحلي
    const allData = readLocalData();
    const tokens = allData[storeId] || {};
    
    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Error fetching platform tokens:', error);
    return NextResponse.json({ tokens: {} });
  }
}

// PUT - حفظ/تحديث token لمنصة معينة
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id;
    const body = await request.json();
    const { platform, accessToken, accountId } = body;

    if (!platform || !accessToken || !accountId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // محاولة استخدام Supabase أولاً
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { error } = await supabase
        .from('store_platform_tokens')
        .upsert({
          store_id: storeId,
          platform: platform,
          access_token: accessToken,
          account_id: accountId,
          connected_at: new Date().toISOString()
        }, {
          onConflict: 'store_id,platform'
        });

      if (!error) {
        return NextResponse.json({ success: true });
      }
    }

    // Fallback للملف المحلي
    const allData = readLocalData();
    if (!allData[storeId]) {
      allData[storeId] = {};
    }
    allData[storeId][platform] = {
      accessToken,
      accountId,
      connectedAt: new Date().toISOString()
    };
    writeLocalData(allData);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving platform token:', error);
    return NextResponse.json({ error: 'Failed to save token' }, { status: 500 });
  }
}

// DELETE - حذف token لمنصة معينة
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const storeId = params.id;
    const body = await request.json();
    const { platform } = body;

    if (!platform) {
      return NextResponse.json({ error: 'Missing platform' }, { status: 400 });
    }

    // محاولة استخدام Supabase أولاً
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { error } = await supabase
        .from('store_platform_tokens')
        .delete()
        .eq('store_id', storeId)
        .eq('platform', platform);

      if (!error) {
        return NextResponse.json({ success: true });
      }
    }

    // Fallback للملف المحلي
    const allData = readLocalData();
    if (allData[storeId] && allData[storeId][platform]) {
      delete allData[storeId][platform];
      writeLocalData(allData);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting platform token:', error);
    return NextResponse.json({ error: 'Failed to delete token' }, { status: 500 });
  }
}
