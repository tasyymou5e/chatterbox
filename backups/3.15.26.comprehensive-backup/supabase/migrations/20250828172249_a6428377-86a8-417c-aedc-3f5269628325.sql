-- Fix infinite recursion in family_members RLS by creating security definer functions
-- Create function to check if user is family creator (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_family_creator(family_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.families 
    WHERE id = family_id_param AND created_by = user_id_param
  );
$$;

-- Create function to check if user is family member (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_family_member(family_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_id = family_id_param AND user_id = user_id_param
  );
$$;

-- Drop existing problematic family_members policies
DROP POLICY IF EXISTS "Family members can view their family members" ON public.family_members;
DROP POLICY IF EXISTS "Parents can add family members" ON public.family_members;

-- Create new safe family_members policies using security definer functions
CREATE POLICY "Family members can view their family members" 
ON public.family_members 
FOR SELECT 
USING (public.is_family_member(family_id, auth.uid()));

CREATE POLICY "Family creators can add family members" 
ON public.family_members 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'parent'::app_role) AND 
  public.is_family_creator(family_id, auth.uid())
);

-- Grant proper permissions to daily_analytics materialized view
GRANT SELECT ON public.daily_analytics TO authenticated;
GRANT SELECT ON public.daily_analytics TO anon;

-- Add RLS policies for profiles table to allow family access
CREATE POLICY "Parents can view their family members' profiles" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  (has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
    SELECT 1 FROM public.family_members fm
    JOIN public.families f ON fm.family_id = f.id
    WHERE f.created_by = auth.uid() AND fm.user_id = profiles.user_id
  ))
);

-- Add RLS policies for engagement_metrics table
CREATE POLICY "Users can view their own engagement metrics" 
ON public.engagement_metrics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Parents can view their family members' engagement metrics" 
ON public.engagement_metrics 
FOR SELECT 
USING (
  has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
    SELECT 1 FROM public.family_members fm
    JOIN public.families f ON fm.family_id = f.id
    WHERE f.created_by = auth.uid() AND fm.user_id = engagement_metrics.user_id
  )
);

-- Add missing policies for analytics_metrics table
CREATE POLICY "Users can view general analytics metrics" 
ON public.analytics_metrics 
FOR SELECT 
USING (
  metric_type IN ('system_performance', 'general_stats') OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create function to refresh daily analytics (for admins only)
CREATE OR REPLACE FUNCTION public.refresh_daily_analytics()
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = 'public'
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_analytics;
$$;

-- Grant execute permission on refresh function to authenticated users with admin role
REVOKE ALL ON FUNCTION public.refresh_daily_analytics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_daily_analytics() TO authenticated;