import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch ad accounts settings
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'ad_accounts')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Return accounts array
    const accounts = data?.value?.accounts || [];
    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error('Error fetching ad accounts:', error);
    return NextResponse.json({ accounts: [] });
  }
}

// POST - Save ad accounts settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accounts = body.accounts || [];

    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('key', 'ad_accounts')
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('settings')
        .update({ value: { accounts }, updated_at: new Date().toISOString() })
        .eq('key', 'ad_accounts');

      if (error) throw error;
    } else {
      // Insert new
      const { error } = await supabase
        .from('settings')
        .insert({
          key: 'ad_accounts',
          value: { accounts },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    }

    return NextResponse.json({ success: true, message: 'تم حفظ الحسابات الإعلانية بنجاح' });
  } catch (error: any) {
    console.error('Error saving ad accounts:', error);
    return NextResponse.json({ error: 'Failed to save ad accounts' }, { status: 500 });
  }
}
