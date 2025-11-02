-- Migration: Consolidated RLS Policy Standardization
-- Purpose: Standardize RLS policies for documents table after resolving conflicts
-- Date: 2024
-- 
-- This migration consolidates the approaches from:
-- - 003b_fix_recursive_rls_policies.sql (parent relationship support)
-- - 003c_simple_rls_policies.sql (direct ownership only)
-- - 003d_cleanup_all_policies.sql (clean slate)
--
-- FINAL APPROACH: Simple direct ownership (owner_id check only)
-- Rationale: Application code handles parent-child relationships by copying owner_id
-- This avoids recursive queries and performance issues

-- Step 1: Enable RLS if not already enabled
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policy variations to ensure clean state
DROP POLICY IF EXISTS "Users can view related assets" ON documents;
DROP POLICY IF EXISTS "Users can view own and related assets" ON documents;
DROP POLICY IF EXISTS "Users can insert assets for their projects" ON documents;
DROP POLICY IF EXISTS "Users can update related assets" ON documents;
DROP POLICY IF EXISTS "Users can delete related assets" ON documents;
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
DROP POLICY IF EXISTS "documents_select_policy" ON documents;
DROP POLICY IF EXISTS "documents_insert_policy" ON documents;
DROP POLICY IF EXISTS "documents_update_policy" ON documents;
DROP POLICY IF EXISTS "documents_delete_policy" ON documents;
DROP POLICY IF EXISTS "documents_owner_select" ON documents;
DROP POLICY IF EXISTS "documents_owner_insert" ON documents;
DROP POLICY IF EXISTS "documents_owner_update" ON documents;
DROP POLICY IF EXISTS "documents_owner_delete" ON documents;
DROP POLICY IF EXISTS "Enable select for users" ON documents;
DROP POLICY IF EXISTS "Enable insert for users" ON documents;
DROP POLICY IF EXISTS "Enable update for users" ON documents;
DROP POLICY IF EXISTS "Enable delete for users" ON documents;

-- Step 3: Create standardized simple policies with consistent naming
-- These policies check direct ownership only (owner_id = auth.uid())
-- Application code must set owner_id correctly when creating child documents

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

-- Step 4: Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO authenticated;

-- Step 5: Verify policies were created correctly
-- Run this query to verify:
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'documents' 
-- ORDER BY policyname;
--
-- Expected result: 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- All should use: owner_id = auth.uid()

-- IMPORTANT NOTES:
-- 1. This approach requires application code to set owner_id correctly
--    when creating child documents (e.g., copy from parent_document_id)
-- 2. If you need parent-child relationship support in RLS, you would need
--    to use EXISTS clauses as in migration 003b, but this adds complexity
-- 3. The current application code appears to use direct ownership, so
--    this simple approach is appropriate

