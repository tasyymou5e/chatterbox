-- Fix the auto_repair_logs view to use SECURITY INVOKER (default, safer)
-- Drop and recreate with explicit security invoker setting
DROP VIEW IF EXISTS public.auto_repair_logs;

CREATE VIEW public.auto_repair_logs 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  timestamp,
  success,
  failure_reason,
  metadata->>'trigger' as trigger_source,
  metadata->'repairedFields' as repaired_fields,
  (metadata->>'totalFieldsRepaired')::int as total_fields_repaired,
  metadata->'profile' as profile_repair_details,
  metadata->'role' as role_repair_details,
  metadata->'family' as family_repair_details,
  metadata->>'startedAt' as started_at,
  metadata->>'completedAt' as completed_at,
  device_info
FROM public.user_activity_logs
WHERE activity_type = 'data_auto_repair'
ORDER BY timestamp DESC;

-- Add comment for documentation
COMMENT ON VIEW public.auto_repair_logs IS 'View for monitoring automatic data repair events. Uses security invoker to respect RLS policies of the querying user.';