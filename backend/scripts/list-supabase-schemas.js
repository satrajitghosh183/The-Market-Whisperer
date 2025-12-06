import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.log('\nPlease set the following environment variables in your .env file:');
  console.log('  SUPABASE_URL=your_supabase_project_url');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (recommended)');
  console.log('  OR');
  console.log('  SUPABASE_ANON_KEY=your_anon_key');
  console.log('\nYou can find these in your Supabase dashboard:');
  console.log('  Project Settings > API');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');
  
  try {
    // Test connection by making a simple query
    const { data, error } = await supabase.from('_realtime').select('*').limit(0);
    
    if (error && error.code === 'PGRST116') {
      console.log('✅ Connected to Supabase successfully!');
      console.log('   (Table "_realtime" check indicates connection is working)\n');
    } else if (!error) {
      console.log('✅ Connected to Supabase successfully!\n');
    } else {
      console.log('⚠️  Connection test completed (some tables may not be accessible)\n');
    }
  } catch (err) {
    console.log('⚠️  Connection test completed\n');
  }
}

async function detectTables() {
  console.log('🔍 Attempting to detect accessible tables...\n');
  
  // Common table names to test
  const commonTables = [
    'users', 'profiles', 'user_profiles',
    'portfolios', 'trades', 'orders', 'positions',
    'stocks', 'transactions', 'wallets',
    'baskets', 'ledger', 'market_data',
    'news', 'sentiments', 'policies'
  ];
  
  const foundTables = [];
  const errors = [];
  
  for (const table of commonTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(0);
      if (!error) {
        foundTables.push(table);
      } else if (error.code !== 'PGRST116') {
        // PGRST116 means table doesn't exist, other errors might mean permission issues
        errors.push({ table, error: error.message });
      }
    } catch (e) {
      // Skip errors
    }
  }
  
  if (foundTables.length > 0) {
    console.log('✅ Found accessible tables:');
    foundTables.forEach(table => console.log(`   - ${table}`));
    console.log();
  } else {
    console.log('⚠️  Could not auto-detect tables with current permissions.\n');
  }
  
  if (errors.length > 0) {
    console.log('⚠️  Some tables had access issues:');
    errors.forEach(({ table, error }) => {
      console.log(`   - ${table}: ${error}`);
    });
    console.log();
  }
}

function showSQLQueries() {
  console.log('📝 To get complete schema information, run these SQL queries in Supabase SQL Editor:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    const sqlFile = join(__dirname, 'supabase-schema-queries.sql');
    const sqlContent = readFileSync(sqlFile, 'utf-8');
    console.log(sqlContent);
  } catch (err) {
    // If file doesn't exist, show the queries inline
    console.log(`
-- Query 1: List all schemas
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY schema_name;

-- Query 2: List all tables with their schemas
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY table_schema, table_name;

-- Query 3: List all tables with column information
SELECT 
    t.table_schema,
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_schema, t.table_name, c.ordinal_position;
    `);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📌 Instructions:');
  console.log('  1. Go to your Supabase Dashboard');
  console.log('  2. Navigate to SQL Editor (left sidebar)');
  console.log('  3. Create a new query');
  console.log('  4. Copy and paste any of the queries above');
  console.log('  5. Click "Run" to execute\n');
}

async function main() {
  console.log('🚀 Supabase Schema Inspector\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await testConnection();
  await detectTables();
  showSQLQueries();
  
  console.log('💡 Tip: For the most complete schema information, use the SQL queries above in the Supabase SQL Editor.\n');
}

main().catch(console.error);
