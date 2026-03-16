-- Add admin SELECT policy for family_members table
CREATE POLICY "Admins can view all family members" 
ON public.family_members 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));