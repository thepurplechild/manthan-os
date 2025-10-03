#!/bin/bash

# Load environment variables
source .env.local

# Read the SQL file
SQL_CONTENT=$(cat db/migrations/001_search_documents_function.sql)

echo "Executing migration: 001_search_documents_function.sql"

# Execute SQL using Supabase REST API
curl -X POST "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -d "{\"sql\": $(echo "$SQL_CONTENT" | jq -R -s .)}" \
  2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ Migration executed successfully!"
else
  echo "❌ Migration failed. Please run the following SQL manually in Supabase SQL Editor:"
  echo
  echo "--- SQL to run manually ---"
  cat db/migrations/001_search_documents_function.sql
  echo "--- End SQL ---"
  echo
  echo "Supabase SQL Editor: ${NEXT_PUBLIC_SUPABASE_URL%/rest/v1}/editor"
fi