-- Database Security Audit Script
-- Purpose: Comprehensive security audit of database schema, RLS policies, and relationships
-- Date: 2024
--
-- This script generates a human-readable report of:
-- - All tables and their RLS status
-- - All RLS policies for each table
-- - Foreign key relationships
-- - Missing indexes
-- - Security gaps and recommendations
--
-- Run this script in Supabase SQL Editor to generate a security audit report

-- ============================================================================
-- SECTION 1: Tables and RLS Status
-- ============================================================================

SELECT 
  '=== TABLES AND RLS STATUS ===' as section,
  '' as details;

SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN 'ENABLED ✓'
    ELSE 'DISABLED ✗ (SECURITY RISK)'
  END as rls_status,
  CASE 
    WHEN rowsecurity THEN 'Secure'
    ELSE 'WARNING: RLS is disabled - data is accessible to all authenticated users'
  END as security_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- SECTION 2: RLS Policies by Table
-- ============================================================================

SELECT 
  '=== RLS POLICIES BY TABLE ===' as section,
  '' as details;

SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NOT NULL THEN qual
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN with_check
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- SECTION 3: Critical Tables Policy Count
-- ============================================================================

SELECT 
  '=== CRITICAL TABLES POLICY COUNT ===' as section,
  '' as details;

SELECT 
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) = 0 THEN 'CRITICAL: No policies - table is unprotected'
    WHEN COUNT(*) < 4 THEN 'WARNING: Missing policies - may have security gaps'
    WHEN COUNT(*) = 4 THEN 'OK: Has SELECT, INSERT, UPDATE, DELETE policies'
    ELSE 'INFO: More than 4 policies - may have redundant policies'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'projects', 'platform_mandates', 'deal_pipeline')
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- SECTION 4: Foreign Key Relationships
-- ============================================================================

SELECT 
  '=== FOREIGN KEY RELATIONSHIPS ===' as section,
  '' as details;

SELECT
  tc.table_name as child_table,
  kcu.column_name as child_column,
  ccu.table_name as parent_table,
  ccu.column_name as parent_column,
  tc.constraint_name,
  rc.delete_rule as on_delete_action
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- SECTION 5: Missing Indexes Check
-- ============================================================================

SELECT 
  '=== INDEXES CHECK ===' as section,
  '' as details;

-- Check for foreign key columns without indexes (potential performance issue)
SELECT 
  tc.table_name,
  kcu.column_name,
  'Missing index on foreign key column' as issue
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN pg_indexes pi
  ON pi.tablename = tc.table_name
  AND pi.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND pi.indexname IS NULL
ORDER BY tc.table_name, kcu.column_name;

-- List all indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- SECTION 6: Security Gaps Analysis
-- ============================================================================

SELECT 
  '=== SECURITY GAPS ANALYSIS ===' as section,
  '' as details;

-- Tables with RLS disabled
SELECT 
  'SECURITY RISK' as severity,
  tablename as table_name,
  'RLS is disabled - all authenticated users can access this table' as issue
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT rowsecurity
ORDER BY tablename;

-- Tables without any policies
SELECT 
  'WARNING' as severity,
  tablename as table_name,
  'Table has RLS enabled but no policies - no one can access it' as issue
FROM pg_tables pt
WHERE schemaname = 'public'
  AND rowsecurity
  AND tablename NOT IN (
    SELECT DISTINCT tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  )
ORDER BY tablename;

-- Tables missing specific operation policies
SELECT 
  'INFO' as severity,
  tablename as table_name,
  'Missing ' || missing_ops || ' policy(ies)' as issue
FROM (
  SELECT 
    tablename,
    string_agg(
      CASE 
        WHEN op = 'SELECT' AND NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = t.tablename AND cmd = 'SELECT'
        ) THEN 'SELECT'
        WHEN op = 'INSERT' AND NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = t.tablename AND cmd = 'INSERT'
        ) THEN 'INSERT'
        WHEN op = 'UPDATE' AND NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = t.tablename AND cmd = 'UPDATE'
        ) THEN 'UPDATE'
        WHEN op = 'DELETE' AND NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE tablename = t.tablename AND cmd = 'DELETE'
        ) THEN 'DELETE'
      END,
      ', '
    ) as missing_ops
  FROM (
    SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public'
  ) t
  CROSS JOIN (
    SELECT 'SELECT' as op UNION ALL SELECT 'INSERT' UNION ALL SELECT 'UPDATE' UNION ALL SELECT 'DELETE'
  ) ops
  GROUP BY tablename
) missing
WHERE missing_ops IS NOT NULL AND missing_ops != ''
ORDER BY tablename;

-- ============================================================================
-- SECTION 7: Role-Based Access Verification
-- ============================================================================

SELECT 
  '=== ROLE-BASED ACCESS VERIFICATION ===' as section,
  '' as details;

-- Check profiles table has role column
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
    ) THEN '✓ Profiles table has role column'
    ELSE '✗ CRITICAL: Profiles table missing role column'
  END as status;

-- Check for users with founder role
SELECT 
  COUNT(*) as founder_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ Founders exist in database'
    ELSE 'INFO: No founders found - ensure at least one user has founder role'
  END as status
FROM profiles
WHERE role = 'founder';

-- List all roles
SELECT 
  role,
  COUNT(*) as user_count
FROM profiles
GROUP BY role
ORDER BY role;

-- ============================================================================
-- SECTION 8: Recommendations
-- ============================================================================

SELECT 
  '=== RECOMMENDATIONS ===' as section,
  '' as details;

SELECT 
  'RLS' as category,
  'Ensure all tables have RLS enabled' as recommendation,
  'Run: ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;' as action
UNION ALL
SELECT 
  'Policies',
  'Ensure all tables have SELECT, INSERT, UPDATE, DELETE policies',
  'Create missing policies as per blueprint requirements'
UNION ALL
SELECT 
  'Indexes',
  'Add indexes on foreign key columns for performance',
  'CREATE INDEX idx_<table>_<column> ON <table>(<column>);'
UNION ALL
SELECT 
  'Roles',
  'Verify founder role assignment',
  'UPDATE profiles SET role = ''founder'' WHERE id = ''<user_id>'';'
UNION ALL
SELECT 
  'Testing',
  'Run RLS test suite (012_test_rls_policies.sql)',
  'Verify all policies work correctly with different user roles';

-- ============================================================================
-- END OF AUDIT REPORT
-- ============================================================================

SELECT 
  '=== END OF SECURITY AUDIT ===' as section,
  'Review all sections above and address any security gaps identified' as details;

