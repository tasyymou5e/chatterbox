-- Fix materialized view security by creating a function instead of RLS
-- Create a security definer function that only admins can use
CREATE OR REPLACE FUNCTION get_popular_content()
RETURNS TABLE (
  id UUID,
  title TEXT,
  category_id UUID,
  age_min INTEGER,
  age_max INTEGER,
  favorite_count BIGINT,
  interaction_count BIGINT,
  popularity_score BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pc.id,
    pc.title,
    pc.category_id,
    pc.age_min,
    pc.age_max,
    pc.favorite_count,
    pc.interaction_count,
    pc.popularity_score
  FROM popular_content pc
  WHERE has_role(auth.uid(), 'admin'::app_role);
$$;