-- Remove email column from profiles table to prevent email harvesting
-- Email addresses remain in auth.users but are not exposed through profiles table

ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Update the RLS policy comment to reflect field-level security is now enforced by column removal
COMMENT ON POLICY "Family members can view basic profile info" ON public.profiles IS 'Allows family members to view first_name and last_name only. Email removed from table for security.';