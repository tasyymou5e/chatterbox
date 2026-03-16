-- Add RLS policy for connected users to view basic profile info
CREATE POLICY "Connected users can view basic family member profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.family_connections fc
    WHERE fc.connected_user_id = auth.uid() 
    AND fc.status = 'accepted'
    AND EXISTS (
      SELECT 1 FROM public.family_members fm 
      WHERE fm.family_id = fc.family_id 
      AND fm.user_id = profiles.user_id
    )
  )
);