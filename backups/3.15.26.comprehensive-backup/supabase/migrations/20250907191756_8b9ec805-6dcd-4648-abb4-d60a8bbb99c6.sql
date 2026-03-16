-- Fix security issues identified by linter

-- Fix 1: Set search_path on function to make it secure
CREATE OR REPLACE FUNCTION refresh_popular_content()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY popular_content;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 2: Restrict access to materialized view - make it admin only
ALTER TABLE popular_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view popular content analytics"
ON popular_content FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));