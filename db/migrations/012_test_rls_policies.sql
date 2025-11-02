-- Migration: RLS Policy Test Suite
-- Purpose: Comprehensive test queries to verify RLS policies work correctly
-- Date: 2024
--
-- This file contains test queries to verify that RLS policies are working as expected
-- IMPORTANT: Run these tests with different user roles (creator vs founder) to verify
-- Run in Supabase SQL Editor or via psql with appropriate user context

-- ============================================================================
-- SETUP: Create test users (run this as superuser/admin)
-- ============================================================================
-- 
-- -- Create test creator user
-- INSERT INTO auth.users (
--   id,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   raw_user_meta_data
-- ) VALUES (
--   gen_random_uuid(),
--   'test-creator@example.com',
--   crypt('password123', gen_salt('bf')),
--   now(),
--   '{"full_name": "Test Creator"}'::jsonb
-- );
--
-- -- Create test founder user
-- INSERT INTO auth.users (
--   id,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   raw_user_meta_data
-- ) VALUES (
--   gen_random_uuid(),
--   'test-founder@example.com',
--   crypt('password123', gen_salt('bf')),
--   now(),
--   '{"full_name": "Test Founder"}'::jsonb
-- );
--
-- -- Update founder profile to have founder role
-- UPDATE profiles SET role = 'founder' WHERE id = (SELECT id FROM auth.users WHERE email = 'test-founder@example.com');

-- ============================================================================
-- TEST 1: Profiles Table RLS
-- ============================================================================

-- Test 1.1: User can view their own profile
-- Expected: SUCCESS (returns 1 row)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<creator_user_id>';
-- SELECT * FROM profiles WHERE id = '<creator_user_id>';

-- Test 1.2: User CANNOT view other user's profile
-- Expected: FAIL (returns 0 rows)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<creator_user_id>';
-- SELECT * FROM profiles WHERE id != '<creator_user_id>';

-- Test 1.3: User can update their own profile
-- Expected: SUCCESS
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<creator_user_id>';
-- UPDATE profiles SET full_name = 'Updated Name' WHERE id = '<creator_user_id>';

-- Test 1.4: User CANNOT update other user's profile
-- Expected: FAIL (0 rows updated)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<creator_user_id>';
-- UPDATE profiles SET full_name = 'Hacked Name' WHERE id != '<creator_user_id>';

-- ============================================================================
-- TEST 2: Projects Table RLS
-- ============================================================================

-- Test 2.1: Creator can view their own projects
-- Expected: SUCCESS (returns only creator's projects)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<creator_user_id>';
-- SELECT * FROM projects WHERE owner_id = '<creator_user_id>';

-- Test 2.2: Creator CANNOT view other creators' projects
-- Expected: FAIL (returns 0 rows)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<creator_user_id>';
-- SELECT * FROM projects WHERE owner_id != '<creator_user_id>';

-- Test 2.3: Creator can create their own project
-- Expected: SUCCESS
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<creator_user_id>';
-- INSERT INTO projects (owner_id, title, description) 
-- VALUES ('<creator_user_id>', 'Test Project', 'Test Description');

-- Test 2.4: Creator CANNOT create project with different owner_id
-- Expected: FAIL
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<creator_user_id>';
-- INSERT INTO projects (owner_id, title) 
-- VALUES ('<other_user_id>', 'Hacked Project');

-- Test 2.5: Founder can view ALL projects
-- Expected: SUCCESS (returns all projects, regardless of owner_id)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<founder_user_id>';
-- SELECT * FROM projects;

-- Test 2.6: Founder can update any project
-- Expected: SUCCESS
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<founder_user_id>';
-- UPDATE projects SET title = 'Updated by Founder' WHERE id = '<some_project_id>';

-- ============================================================================
-- TEST 3: Platform Mandates Table RLS (Founder-Only)
-- ============================================================================

-- Test 3.1: Creator CANNOT access platform_mandates
-- Expected: FAIL (permission denied or 0 rows)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<creator_user_id>';
-- SELECT * FROM platform_mandates;

-- Test 3.2: Creator CANNOT insert into platform_mandates
-- Expected: FAIL (permission denied)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<creator_user_id>';
-- INSERT INTO platform_mandates (platform_name, mandate_description, created_by)
-- VALUES ('Netflix', 'Looking for thrillers', '<creator_user_id>');

-- Test 3.3: Founder CAN access platform_mandates
-- Expected: SUCCESS (can view all mandates)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<founder_user_id>';
-- SELECT * FROM platform_mandates;

-- Test 3.4: Founder can create mandate
-- Expected: SUCCESS
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<founder_user_id>';
-- INSERT INTO platform_mandates (platform_name, mandate_description, created_by, tags)
-- VALUES ('Netflix', 'Looking for female-led thrillers', '<founder_user_id>', ARRAY['thriller', 'female-led']);

-- Test 3.5: Founder can update any mandate
-- Expected: SUCCESS
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<founder_user_id>';
-- UPDATE platform_mandates SET mandate_description = 'Updated description' WHERE id = '<mandate_id>';

-- Test 3.6: Founder can delete any mandate
-- Expected: SUCCESS
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<founder_user_id>';
-- DELETE FROM platform_mandates WHERE id = '<mandate_id>';

-- ============================================================================
-- TEST 4: Deal Pipeline Table RLS (Founder-Only)
-- ============================================================================

-- Test 4.1: Creator CANNOT access deal_pipeline
-- Expected: FAIL (permission denied or 0 rows)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<creator_user_id>';
-- SELECT * FROM deal_pipeline;

-- Test 4.2: Creator CANNOT insert into deal_pipeline
-- Expected: FAIL (permission denied)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<creator_user_id>';
-- INSERT INTO deal_pipeline (project_id, target_buyer_name, status)
-- VALUES ('<project_id>', 'Netflix', 'introduced');

-- Test 4.3: Founder CAN access deal_pipeline
-- Expected: SUCCESS (can view all deals)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<founder_user_id>';
-- SELECT * FROM deal_pipeline;

-- Test 4.4: Founder can create deal entry
-- Expected: SUCCESS
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<founder_user_id>';
-- INSERT INTO deal_pipeline (project_id, target_buyer_name, status, feedback_notes)
-- VALUES ('<project_id>', 'Netflix', 'in_discussion', 'Initial interest shown');

-- Test 4.5: Founder can update deal status
-- Expected: SUCCESS
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<founder_user_id>';
-- UPDATE deal_pipeline SET status = 'deal_closed', feedback_notes = 'Deal closed successfully' WHERE id = '<deal_id>';

-- Test 4.6: Founder can delete deal entry
-- Expected: SUCCESS
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<founder_user_id>';
-- DELETE FROM deal_pipeline WHERE id = '<deal_id>';

-- ============================================================================
-- TEST 5: Role Verification Helper Queries
-- ============================================================================

-- Test 5.1: Verify user role
-- Returns the role of the current authenticated user
-- SELECT role FROM profiles WHERE id = auth.uid();

-- Test 5.2: Check if user is founder
-- Returns true if current user is founder, false otherwise
-- SELECT EXISTS (
--   SELECT 1 FROM profiles
--   WHERE id = auth.uid()
--   AND role = 'founder'
-- );

-- Test 5.3: List all founders
-- Returns all users with founder role (useful for admin verification)
-- SELECT id, full_name, email, role, created_at
-- FROM profiles
-- WHERE role = 'founder';

-- ============================================================================
-- TEST 6: Integration Tests
-- ============================================================================

-- Test 6.1: Founder can view project with associated deals
-- Expected: SUCCESS (joins work correctly with RLS)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<founder_user_id>';
-- SELECT 
--   p.id,
--   p.title,
--   p.owner_id,
--   dp.id as deal_id,
--   dp.target_buyer_name,
--   dp.status
-- FROM projects p
-- LEFT JOIN deal_pipeline dp ON p.id = dp.project_id
-- ORDER BY p.created_at DESC;

-- Test 6.2: Creator can view their own projects but NOT deals
-- Expected: SUCCESS for projects, FAIL for deals (deals won't appear due to RLS)
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<creator_user_id>';
-- SELECT 
--   p.id,
--   p.title,
--   p.owner_id
-- FROM projects p
-- WHERE p.owner_id = '<creator_user_id>';
-- -- Note: Joining with deal_pipeline will fail due to RLS

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================

-- To verify all tests pass, check:
-- 1. Run each test query with appropriate user context
-- 2. Expected failures should return 0 rows or permission denied errors
-- 3. Expected successes should return data or update successfully
-- 4. Use Supabase logs to verify RLS policies are being enforced

-- ============================================================================
-- NOTES FOR MANUAL TESTING
-- ============================================================================

-- In Supabase Dashboard:
-- 1. Create test users via Auth > Users
-- 2. Create profiles for test users (should auto-create via trigger)
-- 3. Update founder profile role manually
-- 4. Create test projects as creator user
-- 5. Test queries by switching user context in SQL Editor
--    (Use SET ROLE authenticated; SET request.jwt.claim.sub = '<user_id>';)
--
-- In Application:
-- 1. Sign up as creator user
-- 2. Try to access /dashboard/founder/* - should redirect
-- 3. Sign up as founder user (or update role in DB)
-- 4. Try to access /dashboard/founder/* - should succeed
-- 5. Test CRUD operations for mandates and pipeline as founder
-- 6. Verify creator cannot access mandates/pipeline endpoints

