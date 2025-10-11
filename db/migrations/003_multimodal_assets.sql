-- Migration: Multi-modal Asset Support
-- Purpose: Extend documents table to support various asset types with backward compatibility

-- Step 1: Create asset_type ENUM
CREATE TYPE asset_type AS ENUM (
  'SCRIPT',           -- Main screenplay (PDF, TXT, FDX)
  'OUTLINE',          -- Story outline/treatment
  'CHARACTER_SHEET',  -- Character descriptions
  'DIALOGUE_SAMPLE',  -- Sample dialogue/scenes
  'VOICE_SAMPLE',     -- Audio: character voice reference (MP3, WAV)
  'AUDIO_PILOT',      -- Audio: full pilot episode (MP3, WAV)
  'IMAGE_REFERENCE',  -- Image: location/character reference (JPG, PNG)
  'IMAGE_CONCEPT',    -- Image: concept art (JPG, PNG)
  'VIDEO_REFERENCE',  -- Video: style/mood reference (MP4, MOV)
  'MOOD_BOARD',       -- PPT/PDF: visual mood board
  'TREATMENT',        -- Extended treatment document
  'PITCH_DECK'        -- Existing pitch deck (PPT, PDF)
);

-- Step 2: Add new columns to documents table
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS asset_type asset_type DEFAULT 'SCRIPT',
ADD COLUMN IF NOT EXISTS asset_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT true;

-- Step 3: Create indexes for asset queries
CREATE INDEX IF NOT EXISTS idx_documents_asset_type ON documents(asset_type);
CREATE INDEX IF NOT EXISTS idx_documents_parent ON documents(parent_document_id) WHERE parent_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_owner_asset ON documents(owner_id, asset_type);

-- Step 4: Update existing documents to have correct asset_type
UPDATE documents
SET asset_type = 'SCRIPT',
    is_primary = true
WHERE asset_type IS NULL;

-- Step 5: Create helper function to get project assets
CREATE OR REPLACE FUNCTION get_project_assets(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  asset_type asset_type,
  storage_url TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.asset_type,
    d.storage_url,
    d.mime_type,
    d.file_size_bytes,
    d.created_at
  FROM documents d
  WHERE
    d.id = p_project_id
    OR d.parent_document_id = p_project_id
  ORDER BY
    d.is_primary DESC,
    d.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Add RLS policy for asset access
-- Users can view assets they own OR that belong to projects they own
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

-- Step 7: Grant execute permission on helper function
GRANT EXECUTE ON FUNCTION get_project_assets TO authenticated;

-- Step 8: Add RLS policies for INSERT, UPDATE, DELETE on related assets
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