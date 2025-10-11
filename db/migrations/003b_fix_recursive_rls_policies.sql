-- Migration: Fix infinite recursion in RLS policies for documents table
-- Purpose: Replace recursive policies with non-recursive EXISTS clauses

-- Step 1: Drop all problematic recursive policies
DROP POLICY IF EXISTS "Users can view related assets" ON documents;
DROP POLICY IF EXISTS "Users can insert assets for their projects" ON documents;
DROP POLICY IF EXISTS "Users can update related assets" ON documents;
DROP POLICY IF EXISTS "Users can delete related assets" ON documents;

-- Step 2: Create non-recursive policies using EXISTS with explicit table alias

-- SELECT Policy: Users can view documents they own or documents with parents they own
CREATE POLICY "Users can view own and related assets"
ON documents FOR SELECT
USING (
  -- User owns this document directly
  owner_id = auth.uid()
  OR
  -- User owns the parent document (check parent's owner directly)
  EXISTS (
    SELECT 1 FROM documents parent
    WHERE parent.id = documents.parent_document_id
    AND parent.owner_id = auth.uid()
  )
);

-- INSERT Policy: Users can insert documents they own or with parents they own
CREATE POLICY "Users can insert assets for their projects"
ON documents FOR INSERT
WITH CHECK (
  -- User owns this document directly
  owner_id = auth.uid()
  OR
  -- User owns the parent document (check parent's owner directly)
  EXISTS (
    SELECT 1 FROM documents parent
    WHERE parent.id = parent_document_id
    AND parent.owner_id = auth.uid()
  )
);

-- UPDATE Policy: Users can update documents they own or with parents they own
CREATE POLICY "Users can update related assets"
ON documents FOR UPDATE
USING (
  -- User owns this document directly
  owner_id = auth.uid()
  OR
  -- User owns the parent document (check parent's owner directly)
  EXISTS (
    SELECT 1 FROM documents parent
    WHERE parent.id = documents.parent_document_id
    AND parent.owner_id = auth.uid()
  )
);

-- DELETE Policy: Users can delete documents they own or with parents they own
CREATE POLICY "Users can delete related assets"
ON documents FOR DELETE
USING (
  -- User owns this document directly
  owner_id = auth.uid()
  OR
  -- User owns the parent document (check parent's owner directly)
  EXISTS (
    SELECT 1 FROM documents parent
    WHERE parent.id = documents.parent_document_id
    AND parent.owner_id = auth.uid()
  )
);