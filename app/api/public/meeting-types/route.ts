/**
 * API: جلب أنواع الاجتماعات (عام)
 * GET /api/public/meeting-types
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials missing');
  }
  return createClient(supabaseUrl, supabaseKey);
}

// أنواع الاجتماعات الافتراضية
const DEFAULT_MEETING_TYPES = [
  {
    id: '1',
    name: 'استشارة سريعة',
    slug: 'quick-consultation',
    description: 'اجتماع قصير للأسئلة السريعة',
    duration_minutes: 15,
    color: '#10B981',
    icon: '⚡',
  },
  {
    id: '2',
    name: 'اجتماع عادي',
    slug: 'standard-meeting',
    description: 'اجتماع لمناقشة المواضيع العامة',
    duration_minutes: 30,
    color: '#6366F1',
    icon: '📅',
  },
  {
    id: '3',
    name: 'اجتماع مطوّل',
    slug: 'extended-meeting',
    description: 'اجتماع للمناقشات التفصيلية',
    duration_minutes: 60,
    color: '#8B5CF6',
    icon: '🕐',
  },
];

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('meeting_types')
      .select('id, name, slug, description, duration_minutes, color, icon')
      .eq('is_active', true)
      .order('duration_minutes', { ascending: true });

    // إذا لم توجد أنواع في قاعدة البيانات، نُرجع الافتراضية
    if (error || !data || data.length === 0) {
      return NextResponse.json({
        success: true,
        types: DEFAULT_MEETING_TYPES,
      });
    }

    return NextResponse.json({
      success: true,
      types: data,
    });
  } catch (error) {
    // في حالة الخطأ، نُرجع الأنواع الافتراضية
    return NextResponse.json({
      success: true,
      types: DEFAULT_MEETING_TYPES,
    });
  }
}
