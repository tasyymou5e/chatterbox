
-- Create ai_usage_quotas table
CREATE TABLE public.ai_usage_quotas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role text NOT NULL UNIQUE CHECK (role IN ('admin', 'parent', 'child', 'moderator', 'user')),
  daily_message_limit integer NOT NULL DEFAULT 20,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_usage_quotas ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read quotas
CREATE POLICY "Authenticated users can read quotas"
ON public.ai_usage_quotas
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify quotas
CREATE POLICY "Admins can manage quotas"
ON public.ai_usage_quotas
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed default quotas
INSERT INTO public.ai_usage_quotas (role, daily_message_limit, enabled) VALUES
  ('admin', -1, true),
  ('parent', 50, true),
  ('child', 20, true);

-- Create trigger for updated_at
CREATE TRIGGER update_ai_usage_quotas_updated_at
  BEFORE UPDATE ON public.ai_usage_quotas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
