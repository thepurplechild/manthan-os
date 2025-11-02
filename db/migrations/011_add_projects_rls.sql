-- Migration: Add RLS Policies to Projects Table
-- Purpose: Enable role-based access control for projects table
-- File: db/migrations/011_add_projects_rls.sql

-- Step 1: Enable Row Level Security on projects table (if not already enabled)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "Founders can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Founders can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Founders can update all projects" ON public.projects;
DROP POLICY IF EXISTS "Founders can delete all projects" ON public.projects;

-- Step 3: RLS Policy - Creators can SELECT only their own projects
-- Founders can SELECT all projects
CREATE POLICY "Users can view their own projects or founders can view all"
ON public.projects
FOR SELECT
USING (
  -- Creator: can only view their own projects
  owner_id = auth.uid()
  OR
  -- Founder: can view all projects
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Step 4: RLS Policy - Creators can INSERT only their own projects
-- Founders can INSERT projects (will be owned by them or they can set owner_id)
CREATE POLICY "Users can insert their own projects or founders can insert"
ON public.projects
FOR INSERT
WITH CHECK (
  -- Creator: can only insert projects they own
  owner_id = auth.uid()
  OR
  -- Founder: can insert any project (including for other users)
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Step 5: RLS Policy - Creators can UPDATE only their own projects
-- Founders can UPDATE all projects
CREATE POLICY "Users can update their own projects or founders can update all"
ON public.projects
FOR UPDATE
USING (
  -- Creator: can only update their own projects
  owner_id = auth.uid()
  OR
  -- Founder: can update all projects
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Step 6: RLS Policy - Creators can DELETE only their own projects
-- Founders can DELETE all projects
CREATE POLICY "Users can delete their own projects or founders can delete all"
ON public.projects
FOR DELETE
USING (
  -- Creator: can only delete their own projects
  owner_id = auth.uid()
  OR
  -- Founder: can delete all projects
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'founder'
  )
);

-- Migration complete
-- Creators can only access their own projects
-- Founders have full access to all projects for deal-making purposes

