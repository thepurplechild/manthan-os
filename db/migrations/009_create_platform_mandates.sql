-- Migration: Create Platform Mandates Table
-- Purpose: Store founder-only market intelligence about platform content mandates
-- File: db/migrations/009_create_platform_mandates.sql

-- Step 1: Create the platform_mandates table
CREATE TABLE IF NOT EXISTS public.platform_mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name TEXT NOT NULL,
  mandate_description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  source TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Create indexes for efficient searching
CREATE INDEX IF NOT EXISTS idx_platform_mandates_platform_name ON public.platform_mandates(platform_name);
CREATE INDEX IF NOT EXISTS idx_platform_mandates_tags ON public.platform_mandates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_platform_mandates_created_by ON public.platform_mandates(created_by);
CREATE INDEX IF NOT EXISTS idx_platform_mandates_created_at ON public.platform_mandates(created_at DESC);

-- Step 3: Enable Row Level Security
ALTER TABLE public.platform_mandates ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policy - Only founders can SELECT platform mandates
CREATE POLICY "Only founders can view platform mandates"
ON public.platform_mandates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Step 5: RLS Policy - Only founders can INSERT platform mandates
CREATE POLICY "Only founders can create platform mandates"
ON public.platform_mandates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
  AND created_by = auth.uid()
);

-- Step 6: RLS Policy - Only founders can UPDATE platform mandates
CREATE POLICY "Only founders can update platform mandates"
ON public.platform_mandates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Step 7: RLS Policy - Only founders can DELETE platform mandates
CREATE POLICY "Only founders can delete platform mandates"
ON public.platform_mandates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Step 8: Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_platform_mandates_updated_at ON public.platform_mandates;
CREATE TRIGGER update_platform_mandates_updated_at
  BEFORE UPDATE ON public.platform_mandates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration complete
-- This table is founder-only and contains proprietary market intelligence

