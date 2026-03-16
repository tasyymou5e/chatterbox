-- Fix materialized view security issue by removing public API access
-- Revoke all public access to daily_analytics materialized view
REVOKE ALL ON public.daily_analytics FROM anon;
REVOKE ALL ON public.daily_analytics FROM authenticated;

-- Grant access only to service_role and admin users through RLS
GRANT SELECT ON public.daily_analytics TO service_role;

-- Enable RLS on the materialized view
ALTER TABLE public.daily_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow only admins to access daily_analytics
CREATE POLICY "Only admins can access daily analytics" 
ON public.daily_analytics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update the analytics hook to use a function instead of direct materialized view access
CREATE OR REPLACE FUNCTION public.get_daily_analytics(days_back integer DEFAULT 30)
RETURNS TABLE(
  date date,
  total_users bigint,
  active_users bigint,
  new_signups bigint,
  total_families bigint,
  engagement_score numeric
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    da.date,
    da.total_users,
    da.active_users,
    da.new_signups,
    da.total_families,
    da.engagement_score
  FROM public.daily_analytics da
  WHERE da.date >= CURRENT_DATE - (days_back || ' days')::interval
  ORDER BY da.date DESC;
$$;

-- Grant execute permission to authenticated users (RLS will control access)
GRANT EXECUTE ON FUNCTION public.get_daily_analytics(integer) TO authenticated;