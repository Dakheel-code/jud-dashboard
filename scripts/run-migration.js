const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🚀 Running meetings migration...\n');

  // قراءة ملف SQL
  const sqlPath = path.join(__dirname, '../supabase/migrations/20260123060800_meetings_complete.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // تقسيم SQL إلى statements
  const statements = sql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt || stmt.startsWith('--')) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { query: stmt + ';' });
      if (error) {
        // Try direct query for some statements
        const { error: error2 } = await supabase.from('_migrations').select('*').limit(0);
        if (error2 && error2.code !== 'PGRST116') {
          console.log(`⚠️  Statement ${i + 1}: ${error.message.substring(0, 50)}...`);
          errorCount++;
        }
      } else {
        successCount++;
      }
    } catch (e) {
      // Ignore errors for now
    }

    // Progress indicator
    if ((i + 1) % 10 === 0) {
      process.stdout.write(`Progress: ${i + 1}/${statements.length}\r`);
    }
  }

  console.log(`\n\n✅ Migration attempted`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log('\n💡 If errors occurred, run the SQL directly in Supabase Dashboard SQL Editor');
}

runMigration().catch(console.error);
