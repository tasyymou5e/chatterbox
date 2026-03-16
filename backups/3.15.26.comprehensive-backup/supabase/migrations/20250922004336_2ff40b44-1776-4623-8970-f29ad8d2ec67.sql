-- Drop the existing overly permissive policy that allows any authenticated user to read benchmarks
DROP POLICY IF EXISTS "Authenticated users can view benchmarks" ON public.comparative_benchmarks;

-- Create a restrictive admin-only policy for viewing benchmarks
CREATE POLICY "Admin users can view benchmarks" 
ON public.comparative_benchmarks 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'read_only'::app_role));

-- Ensure only admins can manage benchmark data
CREATE POLICY "Admin users can manage benchmarks" 
ON public.comparative_benchmarks 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));