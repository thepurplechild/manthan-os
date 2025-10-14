-- Migration: Add file_size column to documents table
-- Purpose: Add file_size column to store document file size in bytes

-- Add file_size column if it doesn't exist
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size bigint;

-- Add comment for documentation
COMMENT ON COLUMN documents.file_size IS 'File size in bytes for the uploaded document';