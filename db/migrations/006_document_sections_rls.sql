-- Migration: Add RLS policies for document_sections table
-- Purpose: Secure document_sections table with proper RLS policies based on document ownership
-- Date: 2024

-- Step 1: Enable Row Level Security on document_sections table (if not already enabled)
ALTER TABLE document_sections ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "document_sections_owner_select" ON document_sections;
DROP POLICY IF EXISTS "document_sections_owner_insert" ON document_sections;
DROP POLICY IF EXISTS "document_sections_owner_update" ON document_sections;
DROP POLICY IF EXISTS "document_sections_owner_delete" ON document_sections;
DROP POLICY IF EXISTS "Users can view document sections for their documents" ON document_sections;
DROP POLICY IF EXISTS "Users can insert document sections for their documents" ON document_sections;
DROP POLICY IF EXISTS "Users can update document sections for their documents" ON document_sections;
DROP POLICY IF EXISTS "Users can delete document sections for their documents" ON document_sections;

-- Step 3: Create RLS policies based on document ownership
-- Users can only access sections for documents they own

-- SELECT Policy: Users can view sections for documents they own
CREATE POLICY "document_sections_owner_select"
ON document_sections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_sections.document_id
    AND documents.owner_id = auth.uid()
  )
);

-- INSERT Policy: Users can insert sections for documents they own
CREATE POLICY "document_sections_owner_insert"
ON document_sections FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_sections.document_id
    AND documents.owner_id = auth.uid()
  )
);

-- UPDATE Policy: Users can update sections for documents they own
CREATE POLICY "document_sections_owner_update"
ON document_sections FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_sections.document_id
    AND documents.owner_id = auth.uid()
  )
);

-- DELETE Policy: Users can delete sections for documents they own
CREATE POLICY "document_sections_owner_delete"
ON document_sections FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_sections.document_id
    AND documents.owner_id = auth.uid()
  )
);

-- Step 4: Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON document_sections TO authenticated;

-- Step 5: Verify policies were created
-- Run this query to verify:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'document_sections';

