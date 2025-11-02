-- Migration: RLS Policy Test Suite
-- Purpose: Comprehensive SQL test queries to verify RLS policies work correctly
-- File: db/migrations/012_test_rls_policies.sql
-- 
-- NOTE: These are test queries, not actual migrations. Run these manually to verify security.
-- Replace <creator_user_id> and <founder_user_id> with actual UUIDs from your database.

-- ============================================================================
-- TEST 1: Creator CANNOT access platform_mandates
-- ============================================================================
-- Expected: Should return 0 rows (permission denied)
-- Run as creator user:
/*
SET ROLE authenticated;
SET request.jwt.claim.sub = '<creator_user_id>';
SELECT COUNT(*) FROM public.platform_mandates;
-- Expected: 0 rows or permission denied error
*/

-- ============================================================================
-- TEST 2: Creator CANNOT access deal_pipeline
-- ============================================================================
-- Expected: Should return 0 rows (permission denied)
-- Run as creator user:
/*
SET ROLE authenticated;
SET request.jwt.claim.sub = '<creator_user_id>';
SELECT COUNT(*) FROM public.deal_pipeline;
-- Expected: 0 rows or permission denied error
*/

-- ============================================================================
-- TEST 3: Creator CAN ONLY access their own projects
-- ============================================================================
-- Expected: Should only return projects where owner_id = creator_user_id
-- Run as creator user:
/*
SET ROLE authenticated;
SET request.jwt.claim.sub = '<creator_user_id>';
SELECT id, title, owner_id FROM public.projects;
-- Expected: Only projects where owner_id = creator_user_id
*/

-- ============================================================================
-- TEST 4: Creator CANNOT INSERT/UPDATE/DELETE other users' projects
-- ============================================================================
-- Expected: Should fail with permission denied
-- Run as creator user:
/*
SET ROLE authenticated;
SET request.jwt.claim.sub = '<creator_user_id>';
-- Try to update another user's project (replace with actual project_id owned by different user)
UPDATE public.projects SET title = 'Hacked' WHERE owner_id != '<creator_user_id>' LIMIT 1;
-- Expected: Permission denied error
*/

-- ============================================================================
-- TEST 5: Founder CAN access platform_mandates
-- ============================================================================
-- Expected: Should return all platform mandates
-- Run as founder user:
/*
SET ROLE authenticated;
SET request.jwt.claim.sub = '<founder_user_id>';
SELECT COUNT(*) FROM public.platform_mandates;
-- Expected: Count of all platform mandates
*/

-- ============================================================================
-- TEST 6: Founder CAN access deal_pipeline
-- ============================================================================
-- Expected: Should return all deal pipeline entries
-- Run as founder user:
/*
SET ROLE authenticated;
SET request.jwt.claim.sub = '<founder_user_id>';
SELECT COUNT(*) FROM public.deal_pipeline;
-- Expected: Count of all deal pipeline entries
*/

-- ============================================================================
-- TEST 7: Founder CAN access ALL projects
-- ============================================================================
-- Expected: Should return all projects regardless of owner_id
-- Run as founder user:
/*
SET ROLE authenticated;
SET request.jwt.claim.sub = '<founder_user_id>';
SELECT id, title, owner_id FROM public.projects;
-- Expected: All projects in the database
*/

-- ============================================================================
-- TEST 8: Founder CAN INSERT/UPDATE/DELETE platform_mandates
-- ============================================================================
-- Expected: Should succeed
-- Run as founder user:
/*
SET ROLE authenticated;
SET request.jwt.claim.sub = '<founder_user_id>';
-- Test INSERT
INSERT INTO public.platform_mandates (platform_name, mandate_description, tags, source, created_by)
VALUES ('Test Platform', 'Test mandate', ARRAY['test'], 'Test source', '<founder_user_id>');

-- Test UPDATE
UPDATE public.platform_mandates 
SET mandate_description = 'Updated mandate'
WHERE platform_name = 'Test Platform';

-- Test DELETE
DELETE FROM public.platform_mandates WHERE platform_name = 'Test Platform';
-- Expected: All operations succeed
*/

-- ============================================================================
-- TEST 9: Founder CAN INSERT/UPDATE/DELETE deal_pipeline entries
-- ============================================================================
-- Expected: Should succeed
-- Run as founder user:
/*
SET ROLE authenticated;
SET request.jwt.claim.sub = '<founder_user_id>';
-- Test INSERT (replace with actual project_id)
INSERT INTO public.deal_pipeline (project_id, target_buyer_name, status, created_by)
VALUES ('<project_id>', 'Test Buyer', 'introduced', '<founder_user_id>');

-- Test UPDATE
UPDATE public.deal_pipeline 
SET status = 'in_discussion'
WHERE target_buyer_name = 'Test Buyer';

-- Test DELETE
DELETE FROM public.deal_pipeline WHERE target_buyer_name = 'Test Buyer';
-- Expected: All operations succeed
*/

-- ============================================================================
-- TEST 10: Creator CANNOT access other creators' profiles
-- ============================================================================
-- Expected: Should only return their own profile
-- Run as creator user:
/*
SET ROLE authenticated;
SET request.jwt.claim.sub = '<creator_user_id>';
SELECT id, full_name, role FROM public.profiles;
-- Expected: Only one row - the creator's own profile
*/

-- ============================================================================
-- TEST 11: Profile auto-creation trigger works
-- ============================================================================
-- Expected: New user signup should automatically create profile
-- Test by creating a new user in auth.users and checking if profile exists:
/*
SELECT p.id, p.full_name, p.role, u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.id = '<new_user_id>';
-- Expected: Profile should exist with role = 'creator'
*/

-- ============================================================================
-- TEST 12: Projects RLS - Founder can update any project
-- ============================================================================
-- Expected: Should succeed
-- Run as founder user:
/*
SET ROLE authenticated;
SET request.jwt.claim.sub = '<founder_user_id>';
-- Try to update a project owned by a creator
UPDATE public.projects 
SET title = 'Updated by Founder'
WHERE owner_id != '<founder_user_id>'
LIMIT 1;
-- Expected: Should succeed
*/

-- ============================================================================
-- COMPREHENSIVE SECURITY CHECK QUERY
-- ============================================================================
-- This query checks all RLS policies at once:
-- Run as authenticated user to see what you can access:
/*
SELECT 
  'profiles' as table_name,
  COUNT(*) as accessible_rows
FROM public.profiles
UNION ALL
SELECT 
  'projects' as table_name,
  COUNT(*) as accessible_rows
FROM public.projects
UNION ALL
SELECT 
  'platform_mandates' as table_name,
  COUNT(*) as accessible_rows
FROM public.platform_mandates
UNION ALL
SELECT 
  'deal_pipeline' as table_name,
  COUNT(*) as accessible_rows
FROM public.deal_pipeline;
-- Expected results depend on user role:
-- Creator: should see own profiles (1), own projects (N), 0 mandates, 0 deals
-- Founder: should see all rows in all tables
*/

-- ============================================================================
-- VERIFICATION HELPERS
-- ============================================================================

-- Check current user's role:
/*
SELECT id, full_name, role 
FROM public.profiles 
WHERE id = auth.uid();
*/

-- Check if RLS is enabled on all tables:
/*
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'projects', 'platform_mandates', 'deal_pipeline');
-- Expected: rowsecurity = true for all tables
*/

-- List all RLS policies:
/*
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'projects', 'platform_mandates', 'deal_pipeline')
ORDER BY tablename, policyname;
-- Expected: Multiple policies per table with appropriate permissions
*/

