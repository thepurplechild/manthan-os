-- Migration: Add RLS Policies to Projects Table
-- Purpose: Implement role-based access control for projects table
-- Date: 2024
--
-- This migration adds RLS policies to the projects table:
-- - Creators: Can SELECT/INSERT/UPDATE/DELETE only their own projects
-- - Founders: Can SELECT ALL projects (cross-user access for deal-making)
--   Founders can also UPDATE/DELETE projects for management purposes

-- Rollback instructions (commented out):
-- DROP POLICY IF EXISTS "Creators can view own projects" ON projects;
-- DROP POLICY IF EXISTS "Creators can insert own projects" ON projects;
-- DROP POLICY IF EXISTS "Creators can update own projects" ON projects;
-- DROP POLICY IF EXISTS "Creators can delete own projects" ON projects;
-- DROP POLICY IF EXISTS "Founders can view all projects" ON projects;
-- DROP POLICY IF EXISTS "Founders can update all projects" ON projects;
-- DROP POLICY IF EXISTS "Founders can delete all projects" ON projects;
-- ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Step 1: Ensure the projects table exists
-- Note: If projects table doesn't exist, this migration will fail
-- You should create the projects table first if it doesn't exist

-- Step 2: Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop any existing policies to ensure clean state
DROP POLICY IF EXISTS "Creators can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Creators can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Creators can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Creators can delete own projects" ON public.projects;
DROP POLICY IF EXISTS "Founders can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Founders can update all projects" ON public.projects;
DROP POLICY IF EXISTS "Founders can delete all projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

-- Step 4: Create RLS policies for Creators
-- Creators can SELECT only their own projects
CREATE POLICY "Creators can view own projects"
ON public.projects FOR SELECT
USING (
  owner_id = auth.uid()
  OR
  -- Founders can also view (handled by separate policy, but this allows OR logic)
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Creators can INSERT only their own projects
CREATE POLICY "Creators can insert own projects"
ON public.projects FOR INSERT
WITH CHECK (
  owner_id = auth.uid()
  OR
  -- Founders can also insert (for management purposes)
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Creators can UPDATE only their own projects
CREATE POLICY "Creators can update own projects"
ON public.projects FOR UPDATE
USING (
  owner_id = auth.uid()
  OR
  -- Founders can update any project (for management purposes)
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
)
WITH CHECK (
  owner_id = auth.uid()
  OR
  -- Founders can update any project
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Creators can DELETE only their own projects
CREATE POLICY "Creators can delete own projects"
ON public.projects FOR DELETE
USING (
  owner_id = auth.uid()
  OR
  -- Founders can delete any project (for management purposes)
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Note: The policies above use OR logic to combine creator and founder access
-- This is more efficient than separate policies for each role
-- However, if you prefer separate policies for clarity, you can split them:
-- 
-- Separate Founder Policies (alternative approach):
-- CREATE POLICY "Founders can view all projects"
-- ON public.projects FOR SELECT
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE profiles.id = auth.uid()
--     AND profiles.role = 'founder'
--   )
-- );
--
-- CREATE POLICY "Founders can update all projects"
-- ON public.projects FOR UPDATE
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE profiles.id = auth.uid()
--     AND profiles.role = 'founder'
--   )
-- )
-- WITH CHECK (
--   EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE profiles.id = auth.uid()
--     AND profiles.role = 'founder'
--   )
-- );
--
-- CREATE POLICY "Founders can delete all projects"
-- ON public.projects FOR DELETE
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE profiles.id = auth.uid()
--     AND profiles.role = 'founder'
--   )
-- );

-- Step 5: Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;

-- Verification queries:
-- Check if RLS is enabled:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'projects';
--
-- Check all policies:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'projects'
-- ORDER BY policyname;
--
-- Test as creator (should only see own projects):
-- SET ROLE authenticated;
-- SELECT * FROM projects;  -- Should only return projects where owner_id = auth.uid()
--
-- Test as founder (should see all projects):
-- SET ROLE authenticated;
-- SELECT * FROM projects;  -- Should return all projects if user has founder role

