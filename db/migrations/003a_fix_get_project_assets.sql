-- Migration: Fix ambiguous column reference in get_project_assets function
-- Purpose: Resolve parameter name conflict by using p_project_id instead of project_id

-- Drop the existing function (if it exists)
DROP FUNCTION IF EXISTS get_project_assets(UUID);

-- Recreate with explicit parameter reference
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
    d.id = p_project_id              -- ✅ Now explicit: function parameter
    OR d.parent_document_id = p_project_id
  ORDER BY
    d.is_primary DESC,
    d.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_project_assets TO authenticated;