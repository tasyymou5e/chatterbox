
-- Create RPC function for admin to see today's AI usage grouped by role
CREATE OR REPLACE FUNCTION public.get_ai_usage_by_role_today()
RETURNS TABLE(role text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.role::text, COUNT(am.id)::bigint
  FROM ai_messages am
  JOIN ai_conversations ac ON ac.id = am.conversation_id
  JOIN user_roles ur ON ur.user_id = ac.user_id
  WHERE am.role = 'user'
    AND am.created_at >= (CURRENT_DATE AT TIME ZONE 'UTC')
  GROUP BY ur.role;
$$;
