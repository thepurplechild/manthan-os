-- Migration: Script Analysis Outputs Table
-- Purpose: Store AI-generated script analysis outputs with versioning and RLS support

-- Create script_analysis_outputs table
CREATE TABLE IF NOT EXISTS script_analysis_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  output_type text NOT NULL CHECK (
    output_type IN (
      'CHARACTER_BIBLE',
      'SYNOPSIS',
      'LOGLINES',
      'ONE_PAGER',
      'GENRE_CLASSIFICATION',
      'PACKAGING_BRIEF'
    )
  ),
  content jsonb NOT NULL,
  status text DEFAULT 'GENERATED' CHECK (
    status IN ('GENERATING', 'GENERATED', 'FAILED')
  ),
  version integer DEFAULT 1,
  processing_time_ms integer,
  ai_model text DEFAULT 'gpt-4o-mini',
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_document_output_version UNIQUE(document_id, output_type, version)
);

-- Enable Row Level Security
ALTER TABLE script_analysis_outputs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access outputs for documents they own
CREATE POLICY "Users can view their own script analysis outputs" ON script_analysis_outputs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = script_analysis_outputs.document_id
      AND documents.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert script analysis outputs for their documents" ON script_analysis_outputs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = script_analysis_outputs.document_id
      AND documents.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own script analysis outputs" ON script_analysis_outputs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = script_analysis_outputs.document_id
      AND documents.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own script analysis outputs" ON script_analysis_outputs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = script_analysis_outputs.document_id
      AND documents.owner_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_script_analysis_outputs_document_id ON script_analysis_outputs(document_id);
CREATE INDEX idx_script_analysis_outputs_output_type ON script_analysis_outputs(output_type);
CREATE INDEX idx_script_analysis_outputs_status ON script_analysis_outputs(status);
CREATE INDEX idx_script_analysis_outputs_created_at ON script_analysis_outputs(created_at DESC);

-- Create composite index for common query patterns
CREATE INDEX idx_script_analysis_outputs_document_type_version ON script_analysis_outputs(document_id, output_type, version DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER update_script_analysis_outputs_updated_at
  BEFORE UPDATE ON script_analysis_outputs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON script_analysis_outputs TO authenticated;