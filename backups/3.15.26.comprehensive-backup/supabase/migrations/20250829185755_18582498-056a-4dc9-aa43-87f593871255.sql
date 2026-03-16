-- Add missing RLS policies for user_roles table to enable admin bootstrap and management

-- Allow inserting admin roles during bootstrap (when no admins exist) or by existing admins
CREATE POLICY "Allow bootstrap admin creation and admin role management" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  -- Allow if no admin users exist (bootstrap scenario)
  (NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role))
  OR 
  -- Allow if current user is an admin
  has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to update user roles
CREATE POLICY "Admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete user roles
CREATE POLICY "Admins can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));