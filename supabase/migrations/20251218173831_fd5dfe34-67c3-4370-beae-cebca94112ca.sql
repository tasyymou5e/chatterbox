-- Optimize RLS policy on llm_api_calls table by wrapping auth.uid() in subquery

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage LLM api calls" ON public.llm_api_calls;

-- Recreate with optimized auth.uid() call
CREATE POLICY "Admins can manage LLM api calls"
ON public.llm_api_calls FOR ALL
USING (has_role((select auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));