-- Optimize RLS policy on llm_cost_budgets table by wrapping auth.uid() in subquery

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage LLM cost budgets" ON public.llm_cost_budgets;

-- Recreate with optimized auth.uid() call
CREATE POLICY "Admins can manage LLM cost budgets"
ON public.llm_cost_budgets FOR ALL
USING (has_role((select auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));