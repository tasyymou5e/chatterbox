-- Add metadata column to families table for test data tracking
ALTER TABLE public.families 
ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;

-- Create cleanup function for test families and associated data
CREATE OR REPLACE FUNCTION public.cleanup_test_families()
RETURNS TABLE(
  families_deleted integer,
  users_deleted integer,
  cleanup_details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  test_family_ids uuid[];
  test_user_ids uuid[];
  families_count integer := 0;
  users_count integer := 0;
  cleanup_result jsonb := '{}';
BEGIN
  -- Only admins can cleanup test data
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required for cleanup operations.';
  END IF;
  
  -- Find all test families
  SELECT ARRAY(
    SELECT f.id 
    FROM public.families f 
    WHERE (f.metadata->>'is_test_family')::boolean = true
  ) INTO test_family_ids;
  
  -- Find all users associated with test families
  SELECT ARRAY(
    SELECT DISTINCT fm.user_id 
    FROM public.family_members fm 
    WHERE fm.family_id = ANY(test_family_ids)
    AND fm.user_id IS NOT NULL
  ) INTO test_user_ids;
  
  -- Count what we're about to delete
  families_count := array_length(test_family_ids, 1);
  users_count := array_length(test_user_ids, 1);
  
  -- Delete family members first (foreign key constraint)
  DELETE FROM public.family_members 
  WHERE family_id = ANY(test_family_ids);
  
  -- Delete child accounts
  DELETE FROM public.child_accounts 
  WHERE family_id = ANY(test_family_ids);
  
  -- Delete families
  DELETE FROM public.families 
  WHERE id = ANY(test_family_ids);
  
  -- Delete user roles for test users
  DELETE FROM public.user_roles 
  WHERE user_id = ANY(test_user_ids);
  
  -- Delete auth users (this will cascade to profiles via trigger)
  FOR i IN 1..COALESCE(array_length(test_user_ids, 1), 0) LOOP
    -- Note: We can't directly delete from auth.users in SQL
    -- This will need to be handled by the edge function
  END LOOP;
  
  -- Build cleanup result
  cleanup_result := jsonb_build_object(
    'test_family_ids', to_jsonb(COALESCE(test_family_ids, '{}'::uuid[])),
    'test_user_ids', to_jsonb(COALESCE(test_user_ids, '{}'::uuid[])),
    'families_deleted', COALESCE(families_count, 0),
    'users_deleted', COALESCE(users_count, 0),
    'timestamp', now()
  );
  
  -- Log cleanup operation
  PERFORM log_admin_operation(
    auth.uid(),
    'test_data_cleanup',
    'families',
    NULL,
    NULL,
    NULL,
    cleanup_result
  );
  
  RETURN QUERY SELECT 
    COALESCE(families_count, 0),
    COALESCE(users_count, 0),
    cleanup_result;
END;
$function$;