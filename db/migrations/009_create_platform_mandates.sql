-- Migration: Create Platform Mandates Table
-- Purpose: Store founder-only market intelligence about platform content mandates
-- Date: 2024
--
-- This table stores proprietary market intelligence gathered by founders
-- about what OTT platforms, studios, and buyers are looking for
-- CRITICAL: Only users with role='founder' can access this table

-- Rollback instructions (commented out):
-- DROP INDEX IF EXISTS idx_platform_mandates_platform_name ON platform_mandates;
-- DROP INDEX IF EXISTS idx_platform_mandates_tags ON platform_mandates;
-- DROP INDEX IF EXISTS idx_platform_mandates_created_by ON platform_mandates;
-- DROP POLICY IF EXISTS "Founders can view all mandates" ON platform_mandates;
-- DROP POLICY IF EXISTS "Founders can create mandates" ON platform_mandates;
-- DROP POLICY IF EXISTS "Founders can update mandates" ON platform_mandates;
-- DROP POLICY IF EXISTS "Founders can delete mandates" ON platform_mandates;
-- DROP TABLE IF EXISTS platform_mandates;

-- Step 1: Create the platform_mandates table
CREATE TABLE IF NOT EXISTS public.platform_mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name TEXT NOT NULL,
  mandate_description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',  -- Array of tags for searchability
  source TEXT,  -- How the intelligence was obtained (e.g., 'Conversation with Exec A')
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_platform_mandates_platform_name ON public.platform_mandates(platform_name);
CREATE INDEX IF NOT EXISTS idx_platform_mandates_tags ON public.platform_mandates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_platform_mandates_created_by ON public.platform_mandates(created_by);
CREATE INDEX IF NOT EXISTS idx_platform_mandates_created_at ON public.platform_mandates(created_at DESC);

-- Step 3: Enable Row Level Security
ALTER TABLE public.platform_mandates ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
-- CRITICAL: Only founders can access this table
-- Policy for SELECT: Founders can view all mandates
CREATE POLICY "Founders can view all mandates"
ON public.platform_mandates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Policy for INSERT: Founders can create mandates
CREATE POLICY "Founders can create mandates"
ON public.platform_mandates FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
  AND created_by = auth.uid()  -- Ensure created_by matches the authenticated user
);

-- Policy for UPDATE: Founders can update any mandate
CREATE POLICY "Founders can update mandates"
ON public.platform_mandates FOR UPDATE
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

-- Policy for DELETE: Founders can delete any mandate
CREATE POLICY "Founders can delete mandates"
ON public.platform_mandates FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Step 5: Grant permissions to authenticated users
-- Note: RLS policies will enforce that only founders can actually use these permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_mandates TO authenticated;

-- Step 6: Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_platform_mandates_updated_at ON public.platform_mandates;
CREATE TRIGGER update_platform_mandates_updated_at
  BEFORE UPDATE ON public.platform_mandates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Verification queries:
-- Check if table exists and has correct structure:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'platform_mandates'
-- ORDER BY ordinal_position;
--
-- Check RLS policies:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'platform_mandates'
-- ORDER BY policyname;
--
-- Test as creator (should fail):
-- SET ROLE authenticated;
-- SELECT * FROM platform_mandates;  -- Should return permission denied
--
-- Test as founder (should succeed):
-- SET ROLE authenticated;
-- SELECT * FROM platform_mandates;  -- Should return results if founder role

