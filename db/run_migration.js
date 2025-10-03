#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read environment variables manually
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};

  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  });

  return env;
}

async function runMigration() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  // Read the migration file
  const migrationPath = path.join(__dirname, 'migrations', '001_search_documents_function.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    console.log('Executing migration: 001_search_documents_function.sql');

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      // Try alternative approach using the SQL Editor endpoint
      const response2 = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.pgrst.object+json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Prefer': 'return=minimal'
        },
        body: sql
      });

      if (!response2.ok) {
        console.error('Migration failed. You may need to run this SQL manually in the Supabase SQL Editor:');
        console.error('Response:', await response2.text());
        console.log('\n--- SQL to run manually ---');
        console.log(sql);
        console.log('--- End SQL ---\n');
        return false;
      }
    }

    console.log('✅ Migration executed successfully!');
    return true;
  } catch (error) {
    console.error('Error executing migration:', error.message);
    console.log('\n--- SQL to run manually in Supabase SQL Editor ---');
    console.log(sql);
    console.log('--- End SQL ---\n');
    return false;
  }
}

runMigration().then(success => {
  if (!success) {
    console.log('Please copy the SQL above and run it manually in your Supabase SQL Editor at:');
    console.log(`${process.env.NEXT_PUBLIC_SUPABASE_URL.replace('/rest/v1', '')}/editor`);
  }
});