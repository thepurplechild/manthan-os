-- Query to check existing RLS policies on documents table
-- Run this in Supabase SQL Editor to see what policies currently exist

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'documents'
ORDER BY policyname;