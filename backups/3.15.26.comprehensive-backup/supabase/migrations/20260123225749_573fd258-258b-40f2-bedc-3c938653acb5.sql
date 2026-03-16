-- Schema Introspection Helper Functions
-- These functions enable the schema validation test suite to query database structure

-- Get all columns for a specific table
CREATE OR REPLACE FUNCTION public.get_table_columns(p_table_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable BOOLEAN,
  column_default TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    (c.is_nullable = 'YES')::BOOLEAN,
    c.column_default::TEXT
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table_name
  ORDER BY c.ordinal_position;
$$;

-- List all public table names
CREATE OR REPLACE FUNCTION public.list_public_tables()
RETURNS TABLE (table_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.table_name::TEXT
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
$$;

-- List all RPC functions in the public schema
CREATE OR REPLACE FUNCTION public.list_rpc_functions()
RETURNS TABLE (function_name TEXT, return_type TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.proname::TEXT as function_name,
    pg_get_function_result(p.oid)::TEXT as return_type
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
  ORDER BY p.proname;
$$;

-- Get column details including constraints
CREATE OR REPLACE FUNCTION public.get_column_details(p_table_name TEXT, p_column_name TEXT)
RETURNS TABLE (
  column_name TEXT,
  data_type TEXT,
  is_nullable BOOLEAN,
  column_default TEXT,
  character_maximum_length INTEGER,
  is_primary_key BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.column_name::TEXT,
    c.data_type::TEXT,
    (c.is_nullable = 'YES')::BOOLEAN,
    c.column_default::TEXT,
    c.character_maximum_length::INTEGER,
    EXISTS(
      SELECT 1 
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = p_table_name
        AND tc.constraint_type = 'PRIMARY KEY'
        AND kcu.column_name = c.column_name
    )::BOOLEAN as is_primary_key
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table_name
    AND c.column_name = p_column_name;
$$;

-- Check if a specific column exists in a table
CREATE OR REPLACE FUNCTION public.column_exists(p_table_name TEXT, p_column_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = p_table_name
      AND column_name = p_column_name
  );
$$;

-- List all database triggers
CREATE OR REPLACE FUNCTION public.list_triggers()
RETURNS TABLE (
  trigger_name TEXT,
  table_name TEXT,
  event_manipulation TEXT,
  action_timing TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.trigger_name::TEXT,
    t.event_object_table::TEXT as table_name,
    t.event_manipulation::TEXT,
    t.action_timing::TEXT
  FROM information_schema.triggers t
  WHERE t.trigger_schema = 'public'
  ORDER BY t.event_object_table, t.trigger_name;
$$;

-- Grant execute permissions to authenticated users (for test suite)
GRANT EXECUTE ON FUNCTION public.get_table_columns(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_rpc_functions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_column_details(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.column_exists(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_triggers() TO authenticated;

-- Also grant to service_role for CI/CD
GRANT EXECUTE ON FUNCTION public.get_table_columns(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_public_tables() TO service_role;
GRANT EXECUTE ON FUNCTION public.list_rpc_functions() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_column_details(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.column_exists(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_triggers() TO service_role;