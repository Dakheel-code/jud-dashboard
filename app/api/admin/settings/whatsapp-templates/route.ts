import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const TEMPLATES_FILE = path.join(process.cwd(), 'data', 'whatsapp-templates.json');

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function readTemplatesFromFile() {
  try {
    if (fs.existsSync(TEMPLATES_FILE)) {
      const data = fs.readFileSync(TEMPLATES_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return parsed;
    } else {
    }
  } catch (err) {
  }
  return null;
}

function writeTemplatesToFile(templates: any) {
  try {
    ensureDataDir();
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
}

const defaultTemplates = {
  daily_update: { 
    name: 'التحديث اليومي', 
    content: 'مرحباً {store_name}،\n\nالتحديث اليومي:\n📊 المبيعات: {sales}\n💰 العائد: {revenue}\n💸 الصرف: {spend}\n\nشكراً لتعاونكم' 
  }
};

// GET - جلب قوالب رسائل الواتساب
export async function GET() {
  try {
    // Try file first (more reliable)
    const fileTemplates = readTemplatesFromFile();
    if (fileTemplates && Object.keys(fileTemplates).length > 0) {
      return NextResponse.json({ templates: fileTemplates });
    }

    // Then try database
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'whatsapp_templates')
        .single();

      if (!error && data?.value) {
        return NextResponse.json({ templates: data.value });
      }
    }

    return NextResponse.json({ templates: defaultTemplates });
  } catch (error: any) {
    return NextResponse.json({ templates: defaultTemplates });
  }
}

// PUT - تحديث قوالب رسائل الواتساب
export async function PUT(request: NextRequest) {
  try {
    const { templates } = await request.json();

    if (!templates) {
      return NextResponse.json({ error: 'Templates are required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    let savedToDb = false;

    if (supabase) {
      try {
        // التحقق من وجود السجل
        const { data: existing } = await supabase
          .from('settings')
          .select('id')
          .eq('key', 'whatsapp_templates')
          .single();

        let result;
        if (existing) {
          result = await supabase
            .from('settings')
            .update({ value: templates, updated_at: new Date().toISOString() })
            .eq('key', 'whatsapp_templates')
            .select()
            .single();
        } else {
          result = await supabase
            .from('settings')
            .insert({ key: 'whatsapp_templates', value: templates })
            .select()
            .single();
        }

        if (!result.error) {
          savedToDb = true;
        }
      } catch (dbErr) {
      }
    }

    // Always save to file as backup
    const savedToFile = writeTemplatesToFile(templates);

    if (savedToDb || savedToFile) {
      return NextResponse.json({ success: true, templates });
    }

    return NextResponse.json({ error: 'Failed to save templates' }, { status: 500 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update templates' }, { status: 500 });
  }
}
