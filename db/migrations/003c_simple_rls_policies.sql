-- Migration: Simplified RLS policies (Alternative approach)
-- Purpose: Remove all recursive queries and rely on direct ownership only
-- Note: This approach requires copying owner_id from parent to child in application logic

-- Step 1: Drop all existing policies (including any variants)
DROP POLICY IF EXISTS "Users can view related assets" ON documents;
DROP POLICY IF EXISTS "Users can view own and related assets" ON documents;
DROP POLICY IF EXISTS "Users can insert assets for their projects" ON documents;
DROP POLICY IF EXISTS "Users can update related assets" ON documents;
DROP POLICY IF EXISTS "Users can delete related assets" ON documents;
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

-- Step 2: Create simple policies that only check direct ownership
-- This requires the application to copy owner_id from parent to child when creating related assets

CREATE POLICY "Users can view own documents"
ON documents FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own documents"
ON documents FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own documents"
ON documents FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own documents"
ON documents FOR DELETE
USING (owner_id = auth.uid());

-- Note: When creating related assets in application code, ensure you set:
-- owner_id = (SELECT owner_id FROM documents WHERE id = parent_document_id)
-- This way all related assets inherit the same owner_id as their parent