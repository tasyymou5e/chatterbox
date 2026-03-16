-- Optimize RLS policy on llm_usage_summaries table by wrapping auth.uid() in subquery

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage LLM usage summaries" ON public.llm_usage_summaries;

-- Recreate with optimized auth.uid() call
CREATE POLICY "Admins can manage LLM usage summaries"
ON public.llm_usage_summaries FOR ALL
USING (has_role((select auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));