import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.error('Make sure .env.local file exists with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const defaultTasks = [
  // الإعدادات الأساسية
  { title: 'ربط بوابة الدفع', category: 'الإعدادات الأساسية', order_index: 1 },
  { title: 'اختيار القالب', category: 'الإعدادات الأساسية', order_index: 2 },
  { title: 'إعداد الشحن', category: 'الإعدادات الأساسية', order_index: 3 },
  { title: 'إضافة معلومات المتجر', category: 'الإعدادات الأساسية', order_index: 4 },
  { title: 'تفعيل طرق الدفع', category: 'الإعدادات الأساسية', order_index: 5 },

  // الإطلاق
  { title: 'تجربة الطلب', category: 'الإطلاق', order_index: 6 },
  { title: 'تفعيل الدومين', category: 'الإطلاق', order_index: 7 },
  { title: 'إضافة المنتجات', category: 'الإطلاق', order_index: 8 },
  { title: 'اختبار عملية الشراء', category: 'الإطلاق', order_index: 9 },
  { title: 'نشر المتجر', category: 'الإطلاق', order_index: 10 },

  // التسويق
  { title: 'ربط Google Analytics', category: 'التسويق', order_index: 11 },
  { title: 'إعداد Snapchat Pixel', category: 'التسويق', order_index: 12 },
  { title: 'ربط Facebook Pixel', category: 'التسويق', order_index: 13 },
  { title: 'إنشاء حملة إعلانية', category: 'التسويق', order_index: 14 },
  { title: 'إعداد Google Ads', category: 'التسويق', order_index: 15 },

  // التحسينات
  { title: 'تحسين SEO', category: 'التحسينات', order_index: 16 },
  { title: 'إضافة سياسة الخصوصية', category: 'التحسينات', order_index: 17 },
  { title: 'إضافة شروط الاستخدام', category: 'التحسينات', order_index: 18 },
  { title: 'تحسين سرعة المتجر', category: 'التحسينات', order_index: 19 },
  { title: 'إضافة صفحة اتصل بنا', category: 'التحسينات', order_index: 20 },
];

async function seedTasks() {
  console.log('🌱 Starting to seed tasks...');

  const { data: existingTasks, error: fetchError } = await supabase
    .from('tasks')
    .select('id')
    .limit(1);

  if (fetchError) {
    console.error('❌ Error checking existing tasks:', fetchError);
    process.exit(1);
  }

  if (existingTasks && existingTasks.length > 0) {
    console.log('⚠️  Tasks already exist. Skipping seed.');
    console.log('💡 To re-seed, delete all tasks from the database first.');
    return;
  }

  const { data, error } = await supabase.from('tasks').insert(defaultTasks).select();

  if (error) {
    console.error('❌ Error seeding tasks:', error);
    process.exit(1);
  }

  console.log(`✅ Successfully seeded ${data?.length} tasks!`);
  console.log('\n📋 Tasks by category:');
  
  const tasksByCategory = defaultTasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = 0;
    }
    acc[task.category]++;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(tasksByCategory).forEach(([category, count]) => {
    console.log(`   - ${category}: ${count} tasks`);
  });
}

seedTasks()
  .then(() => {
    console.log('\n✨ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
