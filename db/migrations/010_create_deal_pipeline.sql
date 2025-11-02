-- Migration: Create Deal Pipeline Table
-- Purpose: Store founder-only deal tracking information for projects
-- File: db/migrations/010_create_deal_pipeline.sql

-- Step 1: Create deal_status enum for type safety
CREATE TYPE deal_status AS ENUM (
  'introduced',
  'passed',
  'in_discussion',
  'deal_closed'
);

-- Step 2: Create the deal_pipeline table
CREATE TABLE IF NOT EXISTS public.deal_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  target_buyer_name TEXT NOT NULL,
  status deal_status NOT NULL DEFAULT 'introduced',
  feedback_notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Ensure unique project-buyer combination
  CONSTRAINT unique_project_buyer UNIQUE(project_id, target_buyer_name)
);

-- Step 3: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_project_id ON public.deal_pipeline(project_id);
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_status ON public.deal_pipeline(status);
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_target_buyer ON public.deal_pipeline(target_buyer_name);
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_created_by ON public.deal_pipeline(created_by);
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_updated_at ON public.deal_pipeline(updated_at DESC);

-- Step 4: Enable Row Level Security
ALTER TABLE public.deal_pipeline ENABLE ROW LEVEL SECURITY;

-- Step 5: RLS Policy - Only founders can SELECT deal pipeline entries
CREATE POLICY "Only founders can view deal pipeline"
ON public.deal_pipeline
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Step 6: RLS Policy - Only founders can INSERT deal pipeline entries
CREATE POLICY "Only founders can create deal pipeline entries"
ON public.deal_pipeline
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
  AND created_by = auth.uid()
);

-- Step 7: RLS Policy - Only founders can UPDATE deal pipeline entries
CREATE POLICY "Only founders can update deal pipeline entries"
ON public.deal_pipeline
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Step 8: RLS Policy - Only founders can DELETE deal pipeline entries
CREATE POLICY "Only founders can delete deal pipeline entries"
ON public.deal_pipeline
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Step 9: Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_deal_pipeline_updated_at ON public.deal_pipeline;
CREATE TRIGGER update_deal_pipeline_updated_at
  BEFORE UPDATE ON public.deal_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration complete
-- This table is founder-only and tracks deal flow for projects

