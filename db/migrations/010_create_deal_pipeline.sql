-- Migration: Create Deal Pipeline Table
-- Purpose: Track deal pipeline for projects (founder-only feature)
-- Date: 2024
--
-- This table tracks the status of deals/pitches for projects
-- CRITICAL: Only users with role='founder' can access this table
-- This enables founders to manage the entire deal pipeline

-- Rollback instructions (commented out):
-- DROP INDEX IF EXISTS idx_deal_pipeline_project_id ON deal_pipeline;
-- DROP INDEX IF EXISTS idx_deal_pipeline_status ON deal_pipeline;
-- DROP INDEX IF EXISTS idx_deal_pipeline_target_buyer ON deal_pipeline;
-- DROP INDEX IF EXISTS idx_deal_pipeline_updated_at ON deal_pipeline;
-- DROP POLICY IF EXISTS "Founders can view all deals" ON deal_pipeline;
-- DROP POLICY IF EXISTS "Founders can create deals" ON deal_pipeline;
-- DROP POLICY IF EXISTS "Founders can update deals" ON deal_pipeline;
-- DROP POLICY IF EXISTS "Founders can delete deals" ON deal_pipeline;
-- DROP TYPE IF EXISTS deal_status;
-- DROP TABLE IF EXISTS deal_pipeline;

-- Step 1: Create deal status enum type
CREATE TYPE deal_status AS ENUM (
  'introduced',     -- Initial introduction made
  'passed',         -- Buyer passed on the project
  'in_discussion',  -- Active discussions/negotiations
  'deal_closed'     -- Deal successfully closed
);

-- Step 2: Create the deal_pipeline table
CREATE TABLE IF NOT EXISTS public.deal_pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  target_buyer_name TEXT NOT NULL,  -- Name of the buyer/studio/platform being pitched
  status deal_status NOT NULL DEFAULT 'introduced',
  feedback_notes TEXT,  -- Logs feedback from the buyer (critical data for future ML)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 3: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_project_id ON public.deal_pipeline(project_id);
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_status ON public.deal_pipeline(status);
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_target_buyer ON public.deal_pipeline(target_buyer_name);
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_updated_at ON public.deal_pipeline(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_pipeline_project_status ON public.deal_pipeline(project_id, status);

-- Step 4: Enable Row Level Security
ALTER TABLE public.deal_pipeline ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
-- CRITICAL: Only founders can access this table
-- Policy for SELECT: Founders can view all deals
CREATE POLICY "Founders can view all deals"
ON public.deal_pipeline FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Policy for INSERT: Founders can create deals
CREATE POLICY "Founders can create deals"
ON public.deal_pipeline FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Policy for UPDATE: Founders can update any deal
CREATE POLICY "Founders can update deals"
ON public.deal_pipeline FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Policy for DELETE: Founders can delete any deal
CREATE POLICY "Founders can delete deals"
ON public.deal_pipeline FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Step 6: Grant permissions to authenticated users
-- Note: RLS policies will enforce that only founders can actually use these permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_pipeline TO authenticated;

-- Step 7: Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_deal_pipeline_updated_at ON public.deal_pipeline;
CREATE TRIGGER update_deal_pipeline_updated_at
  BEFORE UPDATE ON public.deal_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Verification queries:
-- Check if table exists and has correct structure:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'deal_pipeline'
-- ORDER BY ordinal_position;
--
-- Check RLS policies:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'deal_pipeline'
-- ORDER BY policyname;
--
-- Check enum type:
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'deal_status'::regtype ORDER BY enumsortorder;
--
-- Test as creator (should fail):
-- SET ROLE authenticated;
-- SELECT * FROM deal_pipeline;  -- Should return permission denied
--
-- Test as founder (should succeed):
-- SET ROLE authenticated;
-- SELECT * FROM deal_pipeline;  -- Should return results if founder role

