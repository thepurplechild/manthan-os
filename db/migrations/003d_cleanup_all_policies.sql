-- Migration: Complete RLS Policy Cleanup and Recreation
-- Purpose: Clean slate approach - remove ALL existing policies and start fresh

-- Step 1: Check existing policies (for reference)
-- Run this first to see what policies exist:
-- SELECT policyname FROM pg_policies WHERE tablename = 'documents';

-- Step 2: Drop ALL possible policy variations
DROP POLICY IF EXISTS "Users can view related assets" ON documents;
DROP POLICY IF EXISTS "Users can view own and related assets" ON documents;
DROP POLICY IF EXISTS "Users can insert assets for their projects" ON documents;
DROP POLICY IF EXISTS "Users can update related assets" ON documents;
DROP POLICY IF EXISTS "Users can delete related assets" ON documents;
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

-- Drop any other common policy names that might exist
DROP POLICY IF EXISTS "documents_select_policy" ON documents;
DROP POLICY IF EXISTS "documents_insert_policy" ON documents;
DROP POLICY IF EXISTS "documents_update_policy" ON documents;
DROP POLICY IF EXISTS "documents_delete_policy" ON documents;
DROP POLICY IF EXISTS "Enable select for users" ON documents;
DROP POLICY IF EXISTS "Enable insert for users" ON documents;
DROP POLICY IF EXISTS "Enable update for users" ON documents;
DROP POLICY IF EXISTS "Enable delete for users" ON documents;

-- Step 3: Create new simple policies with unique names
CREATE POLICY "documents_owner_select"
ON documents FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "documents_owner_insert"
ON documents FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "documents_owner_update"
ON documents FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "documents_owner_delete"
ON documents FOR DELETE
USING (owner_id = auth.uid());

-- Step 4: Verify policies were created
-- Run this to confirm:
-- SELECT policyname FROM pg_policies WHERE tablename = 'documents';