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

async function verifyFunction() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  try {
    console.log('Checking if search_documents function exists...');

    // Try to call the function with a dummy vector to see if it exists
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/search_documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({
        query_embedding: new Array(512).fill(0.1), // dummy 512-dim vector
        match_threshold: 0.5,
        match_count: 5
      })
    });

    if (response.ok) {
      console.log('✅ search_documents function exists and is callable!');
      const result = await response.json();
      console.log(`📊 Function returned ${result.length} results`);
      return true;
    } else if (response.status === 404) {
      const error = await response.json();
      if (error.message && error.message.includes('search_documents')) {
        console.log('❌ search_documents function not found');
        console.log('Please run the SQL migration manually in Supabase SQL Editor');
        return false;
      }
    }

    console.log('⚠️  Function call returned unexpected response:', response.status);
    const errorText = await response.text();
    console.log('Response:', errorText);
    return false;

  } catch (error) {
    console.error('Error verifying function:', error.message);
    return false;
  }
}

async function testWithDummyVector() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    console.log('\n🧪 Testing function with dummy vector...');

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/search_documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({
        query_embedding: new Array(512).fill(0.1),
        match_threshold: 0.5,
        match_count: 5
      })
    });

    if (response.ok) {
      const results = await response.json();
      console.log(`✅ Test successful! Found ${results.length} matching documents`);
      if (results.length > 0) {
        console.log('Sample result structure:');
        console.log(JSON.stringify(results[0], null, 2));
      }
      return true;
    } else {
      const error = await response.json();
      console.log('❌ Test failed:', error.message);
      return false;
    }
  } catch (error) {
    console.error('Error testing function:', error.message);
    return false;
  }
}

async function main() {
  const functionExists = await verifyFunction();

  if (functionExists) {
    await testWithDummyVector();
  } else {
    console.log('\n--- Manual SQL to run in Supabase SQL Editor ---');
    const sqlPath = path.join(__dirname, 'migrations', '001_search_documents_function.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(sql);
    console.log('--- End SQL ---\n');
    const env = loadEnv();
    console.log(`Supabase SQL Editor: ${env.NEXT_PUBLIC_SUPABASE_URL.replace('/rest/v1', '')}/editor`);
  }
}

main().catch(console.error);