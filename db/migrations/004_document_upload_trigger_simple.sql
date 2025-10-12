-- Migration: Document Upload Trigger (Supabase-compatible)
-- Purpose: Automatically trigger document processing workflow when documents are uploaded
-- Note: This creates a trigger that calls our Inngest endpoint via pg_net extension

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS trigger_document_upload ON documents;
DROP FUNCTION IF EXISTS handle_document_upload();

-- Create function to handle document upload events
CREATE OR REPLACE FUNCTION handle_document_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for documents with specific asset types that need processing
  IF NEW.asset_type IN ('SCRIPT', 'OUTLINE', 'TREATMENT') THEN
    -- Use Supabase's pg_net extension to make HTTP requests
    -- This will call our Inngest trigger endpoint
    PERFORM
      net.http_post(
        url := 'https://manthan-os-production.up.railway.app/api/inngest/trigger',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
          'event', 'document.uploaded',
          'data', json_build_object(
            'documentId', NEW.id,
            'storagePath', NEW.storage_path,
            'ownerId', NEW.owner_id,
            'title', NEW.title,
            'fileSize', NEW.file_size_bytes
          )
        )::text
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after document insert
CREATE TRIGGER trigger_document_upload
  AFTER INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION handle_document_upload();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_document_upload() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION handle_document_upload() IS 'Automatically triggers document processing workflow via Inngest when documents are uploaded';
COMMENT ON TRIGGER trigger_document_upload ON documents IS 'Triggers document processing workflow after document upload';