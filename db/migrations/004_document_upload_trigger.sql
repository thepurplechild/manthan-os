-- Migration: Document Upload Trigger
-- Purpose: Automatically trigger document processing workflow when documents are uploaded

-- Create function to handle document upload events
CREATE OR REPLACE FUNCTION handle_document_upload()
RETURNS TRIGGER AS $$
DECLARE
  inngest_url text;
  inngest_payload jsonb;
  http_response record;
BEGIN
  -- Only trigger for documents with asset_type 'DOCUMENT' or NULL (backward compatibility)
  IF NEW.asset_type IS NULL OR NEW.asset_type = 'DOCUMENT' THEN
    -- Get the Inngest trigger URL from environment
    inngest_url := current_setting('app.inngest_trigger_url', true);

    -- Skip if no Inngest URL configured
    IF inngest_url IS NULL OR inngest_url = '' THEN
      RAISE NOTICE 'Inngest trigger URL not configured, skipping event';
      RETURN NEW;
    END IF;

    -- Prepare the payload for Inngest
    inngest_payload := jsonb_build_object(
      'event', 'document.uploaded',
      'data', jsonb_build_object(
        'documentId', NEW.id,
        'storagePath', NEW.storage_path,
        'ownerId', NEW.owner_id,
        'title', NEW.title,
        'fileSize', NEW.file_size_bytes
      )
    );

    -- Make HTTP POST request to Inngest trigger endpoint
    -- Note: This requires the http extension to be enabled
    BEGIN
      SELECT INTO http_response
        *
      FROM
        http_post(
          inngest_url,
          inngest_payload::text,
          'application/json'::text
        );

      -- Log the response for debugging
      RAISE NOTICE 'Inngest trigger response: status=%, content=%', http_response.status, http_response.content;

      -- Log error if request failed
      IF http_response.status != 200 THEN
        RAISE WARNING 'Failed to trigger Inngest event: status=%, content=%', http_response.status, http_response.content;
      END IF;

    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error but don't fail the transaction
        RAISE WARNING 'Error triggering Inngest event: %', SQLERRM;
    END;
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