-- Query to verify the search_documents function exists
SELECT
  p.proname as function_name,
  p.prorettype::regtype as return_type,
  p.proargtypes::regtype[] as argument_types,
  p.prosecdef as security_definer,
  n.nspname as schema_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'search_documents'
  AND n.nspname = 'public';