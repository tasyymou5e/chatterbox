-- Add RLS policy to allow anonymous users to read non-sensitive site settings
CREATE POLICY "Allow anonymous read for public site settings" 
ON public.site_settings 
FOR SELECT 
TO anon, authenticated
USING (
  setting_key IN (
    'parent_signup_enabled',
    'site_maintenance_mode', 
    'max_families_per_parent'
  )
);