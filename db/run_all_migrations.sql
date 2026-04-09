BEGIN;

-- ============================================================================
-- 001_search_documents_function.sql
-- ============================================================================
CREATE OR REPLACE FUNCTION public.search_documents(
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
    1 - (ds.embedding <=> query_embedding) AS similarity,
    d.title AS document_title,
    ds.section_type,
    ds.metadata
  FROM public.document_sections ds
  JOIN public.documents d ON d.id = ds.document_id
  WHERE
    d.owner_id = COALESCE(filter_user_id, auth.uid())
    AND ds.embedding IS NOT NULL
    AND 1 - (ds.embedding <=> query_embedding) > match_threshold
  ORDER BY ds.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_documents TO authenticated;

-- ============================================================================
-- 002_script_analysis_outputs.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.script_analysis_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
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

ALTER TABLE public.script_analysis_outputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own script analysis outputs" ON public.script_analysis_outputs;
CREATE POLICY "Users can view their own script analysis outputs"
ON public.script_analysis_outputs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = script_analysis_outputs.document_id
      AND d.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert script analysis outputs for their documents" ON public.script_analysis_outputs;
CREATE POLICY "Users can insert script analysis outputs for their documents"
ON public.script_analysis_outputs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = script_analysis_outputs.document_id
      AND d.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own script analysis outputs" ON public.script_analysis_outputs;
CREATE POLICY "Users can update their own script analysis outputs"
ON public.script_analysis_outputs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = script_analysis_outputs.document_id
      AND d.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own script analysis outputs" ON public.script_analysis_outputs;
CREATE POLICY "Users can delete their own script analysis outputs"
ON public.script_analysis_outputs
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = script_analysis_outputs.document_id
      AND d.owner_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_script_analysis_outputs_document_id
  ON public.script_analysis_outputs(document_id);
CREATE INDEX IF NOT EXISTS idx_script_analysis_outputs_output_type
  ON public.script_analysis_outputs(output_type);
CREATE INDEX IF NOT EXISTS idx_script_analysis_outputs_status
  ON public.script_analysis_outputs(status);
CREATE INDEX IF NOT EXISTS idx_script_analysis_outputs_created_at
  ON public.script_analysis_outputs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_script_analysis_outputs_document_type_version
  ON public.script_analysis_outputs(document_id, output_type, version DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_script_analysis_outputs_updated_at ON public.script_analysis_outputs;
CREATE TRIGGER update_script_analysis_outputs_updated_at
  BEFORE UPDATE ON public.script_analysis_outputs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.script_analysis_outputs TO authenticated;

-- ============================================================================
-- 003_multimodal_assets.sql (+003a final function)
-- ============================================================================
DO $$
BEGIN
  CREATE TYPE public.asset_type AS ENUM (
    'SCRIPT',
    'OUTLINE',
    'CHARACTER_SHEET',
    'DIALOGUE_SAMPLE',
    'VOICE_SAMPLE',
    'AUDIO_PILOT',
    'IMAGE_REFERENCE',
    'IMAGE_CONCEPT',
    'VIDEO_REFERENCE',
    'MOOD_BOARD',
    'TREATMENT',
    'PITCH_DECK'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS asset_type public.asset_type DEFAULT 'SCRIPT',
  ADD COLUMN IF NOT EXISTS asset_metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS parent_document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS file_size bigint;

CREATE INDEX IF NOT EXISTS idx_documents_asset_type
  ON public.documents(asset_type);
CREATE INDEX IF NOT EXISTS idx_documents_parent
  ON public.documents(parent_document_id)
  WHERE parent_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_owner_asset
  ON public.documents(owner_id, asset_type);

UPDATE public.documents
SET asset_type = 'SCRIPT',
    is_primary = true
WHERE asset_type IS NULL;

COMMENT ON COLUMN public.documents.file_size IS 'File size in bytes for the uploaded document';

CREATE OR REPLACE FUNCTION public.get_project_assets(p_project_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  asset_type public.asset_type,
  storage_url text,
  mime_type text,
  file_size_bytes bigint,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  FROM public.documents d
  WHERE d.id = p_project_id
     OR d.parent_document_id = p_project_id
  ORDER BY d.is_primary DESC, d.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_assets(uuid) TO authenticated;

-- ============================================================================
-- 006_document_sections_rls.sql
-- ============================================================================
ALTER TABLE public.document_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_sections_owner_select" ON public.document_sections;
CREATE POLICY "document_sections_owner_select"
ON public.document_sections
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = document_sections.document_id
      AND d.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "document_sections_owner_insert" ON public.document_sections;
CREATE POLICY "document_sections_owner_insert"
ON public.document_sections
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = document_sections.document_id
      AND d.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "document_sections_owner_update" ON public.document_sections;
CREATE POLICY "document_sections_owner_update"
ON public.document_sections
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = document_sections.document_id
      AND d.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "document_sections_owner_delete" ON public.document_sections;
CREATE POLICY "document_sections_owner_delete"
ON public.document_sections
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.id = document_sections.document_id
      AND d.owner_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_sections TO authenticated;

-- ============================================================================
-- 007_consolidate_documents_rls.sql (final documents RLS)
-- ============================================================================
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view related assets" ON public.documents;
DROP POLICY IF EXISTS "Users can view own and related assets" ON public.documents;
DROP POLICY IF EXISTS "Users can insert assets for their projects" ON public.documents;
DROP POLICY IF EXISTS "Users can update related assets" ON public.documents;
DROP POLICY IF EXISTS "Users can delete related assets" ON public.documents;
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
DROP POLICY IF EXISTS "documents_select_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_update_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_policy" ON public.documents;
DROP POLICY IF EXISTS "documents_owner_select" ON public.documents;
DROP POLICY IF EXISTS "documents_owner_insert" ON public.documents;
DROP POLICY IF EXISTS "documents_owner_update" ON public.documents;
DROP POLICY IF EXISTS "documents_owner_delete" ON public.documents;
DROP POLICY IF EXISTS "Enable select for users" ON public.documents;
DROP POLICY IF EXISTS "Enable insert for users" ON public.documents;
DROP POLICY IF EXISTS "Enable update for users" ON public.documents;
DROP POLICY IF EXISTS "Enable delete for users" ON public.documents;

DROP POLICY IF EXISTS "documents_owner_select" ON public.documents;
CREATE POLICY "documents_owner_select"
ON public.documents
FOR SELECT
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "documents_owner_insert" ON public.documents;
CREATE POLICY "documents_owner_insert"
ON public.documents
FOR INSERT
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "documents_owner_update" ON public.documents;
CREATE POLICY "documents_owner_update"
ON public.documents
FOR UPDATE
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "documents_owner_delete" ON public.documents;
CREATE POLICY "documents_owner_delete"
ON public.documents
FOR DELETE
USING (owner_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;

-- ============================================================================
-- 004_document_upload_trigger_simple.sql (final trigger variant)
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_document_upload ON public.documents;

CREATE OR REPLACE FUNCTION public.handle_document_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.asset_type IN ('SCRIPT', 'OUTLINE', 'TREATMENT') THEN
    PERFORM net.http_post(
      url := 'https://manthan-os-production.up.railway.app/api/inngest/trigger',
      headers := '{"Content-Type":"application/json"}'::jsonb,
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
$$;

CREATE TRIGGER trigger_document_upload
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_document_upload();

GRANT EXECUTE ON FUNCTION public.handle_document_upload() TO authenticated;
COMMENT ON FUNCTION public.handle_document_upload() IS 'Automatically triggers document processing workflow via Inngest when documents are uploaded';
COMMENT ON TRIGGER trigger_document_upload ON public.documents IS 'Triggers document processing workflow after document upload';

-- ============================================================================
-- 008_create_profiles_with_roles.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text NOT NULL DEFAULT 'creator' CHECK (role IN ('creator', 'founder')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'creator'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.profiles (id, full_name, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  'creator'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
);

-- ============================================================================
-- 009_create_platform_mandates.sql
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.platform_mandates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name text NOT NULL,
  mandate_description text NOT NULL,
  tags text[] DEFAULT '{}',
  source text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_mandates_platform_name ON public.platform_mandates(platform_name);
CREATE INDEX IF NOT EXISTS idx_platform_mandates_tags ON public.platform_mandates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_platform_mandates_created_by ON public.platform_mandates(created_by);
CREATE INDEX IF NOT EXISTS idx_platform_mandates_created_at ON public.platform_mandates(created_at DESC);

ALTER TABLE public.platform_mandates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only founders can view platform mandates" ON public.platform_mandates;
CREATE POLICY "Only founders can view platform mandates"
ON public.platform_mandates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'founder'
  )
);

DROP POLICY IF EXISTS "Only founders can create platform mandates" ON public.platform_mandates;
CREATE POLICY "Only founders can create platform mandates"
ON public.platform_mandates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'founder'
  )
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Only founders can update platform mandates" ON public.platform_mandates;
CREATE POLICY "Only founders can update platform mandates"
ON public.platform_mandates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'founder'
  )
);

DROP POLICY IF EXISTS "Only founders can delete platform mandates" ON public.platform_mandates;
CREATE POLICY "Only founders can delete platform mandates"
ON public.platform_mandates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'founder'
  )
);

DROP TRIGGER IF EXISTS update_platform_mandates_updated_at ON public.platform_mandates;
CREATE TRIGGER update_platform_mandates_updated_at
  BEFORE UPDATE ON public.platform_mandates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 010_create_deal_pipeline.sql
-- ============================================================================
DO $$
BEGIN
  CREATE TYPE public.deal_status AS ENUM (
    'introduced',
    'passed',
    'in_discussion',
    'deal_closed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.deal_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  target_buyer_name text NOT NULL,
  status public.deal_status NOT NULL DEFAULT 'introduced',
  feedback_notes text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_project_buyer UNIQUE(project_id, target_buyer_name)
);

CREATE INDEX IF NOT EXISTS idx_deal_pipeline_project_id ON public.deal_pipeline(project_id);
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_status ON public.deal_pipeline(status);
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_target_buyer ON public.deal_pipeline(target_buyer_name);
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_created_by ON public.deal_pipeline(created_by);
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_updated_at ON public.deal_pipeline(updated_at DESC);

ALTER TABLE public.deal_pipeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only founders can view deal pipeline" ON public.deal_pipeline;
CREATE POLICY "Only founders can view deal pipeline"
ON public.deal_pipeline
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'founder'
  )
);

DROP POLICY IF EXISTS "Only founders can create deal pipeline entries" ON public.deal_pipeline;
CREATE POLICY "Only founders can create deal pipeline entries"
ON public.deal_pipeline
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'founder'
  )
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Only founders can update deal pipeline entries" ON public.deal_pipeline;
CREATE POLICY "Only founders can update deal pipeline entries"
ON public.deal_pipeline
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'founder'
  )
);

DROP POLICY IF EXISTS "Only founders can delete deal pipeline entries" ON public.deal_pipeline;
CREATE POLICY "Only founders can delete deal pipeline entries"
ON public.deal_pipeline
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'founder'
  )
);

DROP TRIGGER IF EXISTS update_deal_pipeline_updated_at ON public.deal_pipeline;
CREATE TRIGGER update_deal_pipeline_updated_at
  BEFORE UPDATE ON public.deal_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 011_add_projects_rls.sql
-- ============================================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Founders can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Founders can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Founders can update all projects" ON public.projects;
DROP POLICY IF EXISTS "Founders can delete all projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their own projects or founders can view all" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects or founders can insert" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects or founders can update all" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects or founders can delete all" ON public.projects;

CREATE POLICY "Users can view their own projects or founders can view all"
ON public.projects
FOR SELECT
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'founder'
  )
);

CREATE POLICY "Users can insert their own projects or founders can insert"
ON public.projects
FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'founder'
  )
);

CREATE POLICY "Users can update their own projects or founders can update all"
ON public.projects
FOR UPDATE
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'founder'
  )
);

CREATE POLICY "Users can delete their own projects or founders can delete all"
ON public.projects
FOR DELETE
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'founder'
  )
);

-- Project World table
CREATE TABLE IF NOT EXISTS public.project_world (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  characters jsonb DEFAULT '[]'::jsonb,
  locations jsonb DEFAULT '[]'::jsonb,
  time_period text,
  social_context text,
  themes jsonb DEFAULT '[]'::jsonb,
  central_question text,
  theme_statement text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id)
);

ALTER TABLE public.project_world ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_world_owner"
ON public.project_world FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_world.project_id
    AND p.owner_id = auth.uid()
  )
);

GRANT ALL ON public.project_world TO authenticated;

COMMIT;
