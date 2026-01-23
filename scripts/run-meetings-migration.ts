/**
 * سكربت لتشغيل migration نظام الاجتماعات
 * 
 * الاستخدام:
 * npx ts-node scripts/run-meetings-migration.ts
 * 
 * أو يمكنك نسخ محتوى الملف SQL وتشغيله مباشرة في Supabase Dashboard:
 * supabase/migrations/20260123060800_meetings_complete.sql
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables:');
    console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nAlternatively, run the SQL directly in Supabase Dashboard:');
    console.error('   supabase/migrations/20260123060800_meetings_complete.sql');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('🚀 Starting meetings migration...\n');

  // قراءة ملف الـ migration
  const migrationPath = path.join(__dirname, '../supabase/migrations/20260123060800_meetings_complete.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  try {
    // تقسيم الـ SQL إلى أجزاء وتنفيذها
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('\n💡 Try running the SQL directly in Supabase Dashboard:');
      console.error('   1. Go to https://supabase.com/dashboard');
      console.error('   2. Select your project');
      console.error('   3. Go to SQL Editor');
      console.error('   4. Paste the contents of: supabase/migrations/20260123060800_meetings_complete.sql');
      console.error('   5. Click Run');
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📋 Created tables:');
    console.log('   - meeting_types');
    console.log('   - employee_meeting_settings');
    console.log('   - employee_availability');
    console.log('   - employee_time_off');
    console.log('   - google_oauth_accounts');
    console.log('   - meetings');
    console.log('   - meeting_logs');
    console.log('   - meeting_rate_limits');
    console.log('\n🔒 RLS enabled on all tables');
    console.log('📊 Indexes created for performance');

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

runMigration();
