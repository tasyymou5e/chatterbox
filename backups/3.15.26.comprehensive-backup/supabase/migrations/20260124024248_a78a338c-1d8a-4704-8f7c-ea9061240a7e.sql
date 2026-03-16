-- Create a view for easy monitoring of auto-repair events
CREATE OR REPLACE VIEW public.auto_repair_logs AS
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
COMMENT ON VIEW public.auto_repair_logs IS 'View for monitoring automatic data repair events that fix missing profiles, roles, and family memberships';

-- Enable RLS on the underlying table (view inherits from table policies)
-- The view will respect the RLS policies on user_activity_logs