import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch all clients with their stores
export async function GET() {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select(`
        *,
        stores:stores(id, store_url, store_name, status, created_at)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ clients: clients || [] });
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

// POST - Create new client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, company_name, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'اسم العميل مطلوب' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        name,
        email: email || null,
        phone: phone || null,
        company_name: company_name || null,
        notes: notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ client: data, message: 'تم إضافة العميل بنجاح' });
  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
