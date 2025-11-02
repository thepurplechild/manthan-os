-- Database Security Audit Script
-- Purpose: Comprehensive security verification for RLS policies and database structure
-- File: db/verify_security.sql
-- 
-- Run this script to get a complete security audit report

-- ============================================================================
-- SECTION 1: RLS STATUS CHECK
-- ============================================================================
SELECT 
  '=== RLS STATUS CHECK ===' as section;

SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN 'ENABLED ✓'
    ELSE 'DISABLED ✗ - SECURITY RISK!'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'projects', 'platform_mandates', 'deal_pipeline', 'documents')
ORDER BY tablename;

-- ============================================================================
-- SECTION 2: RLS POLICIES INVENTORY
-- ============================================================================
SELECT 
  '=== RLS POLICIES INVENTORY ===' as section;

SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN 'PERMISSIVE'
    ELSE 'RESTRICTIVE'
  END as policy_type,
  pg_get_expr(qual, 'public'::regclass) as using_expression,
  pg_get_expr(with_check, 'public'::regclass) as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'projects', 'platform_mandates', 'deal_pipeline')
ORDER BY tablename, cmd, policyname;

-- ============================================================================
-- SECTION 3: FOREIGN KEY RELATIONSHIPS
-- ============================================================================
SELECT 
  '=== FOREIGN KEY RELATIONSHIPS ===' as section;

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('profiles', 'projects', 'platform_mandates', 'deal_pipeline')
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- SECTION 4: INDEX COVERAGE CHECK
-- ============================================================================
SELECT 
  '=== INDEX COVERAGE CHECK ===' as section;

SELECT
  t.tablename,
  CASE 
    WHEN i.indexname IS NULL THEN 'MISSING INDEXES ✗'
    ELSE 'HAS INDEXES ✓'
  END as index_status,
  COALESCE(array_agg(i.indexname) FILTER (WHERE i.indexname IS NOT NULL), ARRAY[]::text[]) as indexes
FROM pg_tables t
LEFT JOIN pg_indexes i ON t.tablename = i.tablename AND i.schemaname = 'public'
WHERE t.schemaname = 'public'
AND t.tablename IN ('profiles', 'projects', 'platform_mandates', 'deal_pipeline')
GROUP BY t.tablename
ORDER BY t.tablename;

-- ============================================================================
-- SECTION 5: REQUIRED INDEXES CHECK
-- ============================================================================
SELECT 
  '=== REQUIRED INDEXES VERIFICATION ===' as section;

-- Check for specific required indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND (
  -- Profiles indexes
  (tablename = 'profiles' AND indexname LIKE 'idx_profiles%')
  OR
  -- Projects indexes (if any required)
  (tablename = 'projects' AND indexname LIKE 'idx_projects%')
  OR
  -- Platform mandates indexes
  (tablename = 'platform_mandates' AND indexname LIKE 'idx_platform_mandates%')
  OR
  -- Deal pipeline indexes
  (tablename = 'deal_pipeline' AND indexname LIKE 'idx_deal_pipeline%')
)
ORDER BY tablename, indexname;

-- ============================================================================
-- SECTION 6: TRIGGER VERIFICATION
-- ============================================================================
SELECT 
  '=== TRIGGER VERIFICATION ===' as section;

SELECT
  trigger_name,
  event_object_table as table_name,
  event_manipulation as event,
  action_statement,
  action_timing,
  action_condition
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('profiles', 'auth.users')
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- SECTION 7: ROLE-BASED ACCESS SUMMARY
-- ============================================================================
SELECT 
  '=== ROLE-BASED ACCESS SUMMARY ===' as section;

-- This query shows what operations are allowed per table
SELECT 
  tablename,
  cmd as operation,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'projects', 'platform_mandates', 'deal_pipeline')
GROUP BY tablename, cmd
ORDER BY tablename, cmd;

-- ============================================================================
-- SECTION 8: SECURITY RECOMMENDATIONS
-- ============================================================================
SELECT 
  '=== SECURITY RECOMMENDATIONS ===' as section;

-- Check for tables without RLS
SELECT 
  'WARNING: Tables without RLS enabled:' as recommendation,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'projects', 'platform_mandates', 'deal_pipeline')
AND tablename NOT IN (
  SELECT DISTINCT tablename 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND rowsecurity = true
);

-- Check for missing policies
SELECT 
  'CHECK: Ensure all tables have SELECT, INSERT, UPDATE, DELETE policies' as recommendation,
  tablename,
  array_agg(DISTINCT cmd) as existing_operations,
  CASE 
    WHEN array_length(array_agg(DISTINCT cmd) FILTER (WHERE cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')), 1) < 4
    THEN 'MISSING OPERATIONS'
    ELSE 'COMPLETE'
  END as policy_completeness
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'projects', 'platform_mandates', 'deal_pipeline')
GROUP BY tablename
HAVING array_length(array_agg(DISTINCT cmd) FILTER (WHERE cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')), 1) < 4
ORDER BY tablename;

-- ============================================================================
-- SECTION 9: DATA INTEGRITY CHECK
-- ============================================================================
SELECT 
  '=== DATA INTEGRITY CHECK ===' as section;

-- Check for orphaned records
SELECT 
  'Orphaned deal_pipeline entries (invalid project_id):' as check_type,
  COUNT(*) as orphaned_count
FROM public.deal_pipeline dp
LEFT JOIN public.projects p ON dp.project_id = p.id
WHERE p.id IS NULL;

SELECT 
  'Orphaned platform_mandates entries (invalid created_by):' as check_type,
  COUNT(*) as orphaned_count
FROM public.platform_mandates pm
LEFT JOIN public.profiles pr ON pm.created_by = pr.id
WHERE pr.id IS NULL;

SELECT 
  'Orphaned deal_pipeline entries (invalid created_by):' as check_type,
  COUNT(*) as orphaned_count
FROM public.deal_pipeline dp
LEFT JOIN public.profiles pr ON dp.created_by = pr.id
WHERE pr.id IS NULL;

SELECT 
  'Profiles without corresponding auth.users:' as check_type,
  COUNT(*) as orphaned_count
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- ============================================================================
-- SECTION 10: SUMMARY REPORT
-- ============================================================================
SELECT 
  '=== SECURITY AUDIT SUMMARY ===' as section;

SELECT 
  'Total tables with RLS enabled:' as metric,
  COUNT(*)::text as value
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'projects', 'platform_mandates', 'deal_pipeline')
AND rowsecurity = true

UNION ALL

SELECT 
  'Total RLS policies:' as metric,
  COUNT(*)::text as value
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'projects', 'platform_mandates', 'deal_pipeline')

UNION ALL

SELECT 
  'Total indexes on security tables:' as metric,
  COUNT(*)::text as value
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'projects', 'platform_mandates', 'deal_pipeline');

-- End of audit script

