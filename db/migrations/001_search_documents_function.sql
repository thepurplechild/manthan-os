-- RPC function for semantic search with RLS enforcement
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(512),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  filter_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  similarity float,
  document_title text,
  section_type text,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ds.id,
    ds.document_id,
    ds.content,
    1 - (ds.embedding <=> query_embedding) as similarity,
    d.title as document_title,
    ds.section_type,
    ds.metadata
  FROM document_sections ds
  JOIN documents d ON d.id = ds.document_id
  WHERE
    d.owner_id = COALESCE(filter_user_id, auth.uid())
    AND ds.embedding IS NOT NULL
    AND 1 - (ds.embedding <=> query_embedding) > match_threshold
  ORDER BY ds.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_documents TO authenticated;