-- Phase 1: Critical Security Fixes - Update RLS Policies
-- Remove anonymous public access and require authenticated family member access

-- Update chore_categories policies
DROP POLICY IF EXISTS "Anyone can view active chore categories" ON public.chore_categories;

CREATE POLICY "Authenticated users can view active chore categories" 
ON public.chore_categories 
FOR SELECT 
USING (
  is_active = true 
  AND auth.uid() IS NOT NULL
);

-- Update chore_templates policies  
DROP POLICY IF EXISTS "Anyone can view active chore templates" ON public.chore_templates;

CREATE POLICY "Authenticated users can view active chore templates"
ON public.chore_templates
FOR SELECT
USING (
  is_active = true
  AND auth.uid() IS NOT NULL
);

-- Update content_categories policies
DROP POLICY IF EXISTS "Anyone can view active categories" ON public.content_categories;

CREATE POLICY "Authenticated users can view active categories"
ON public.content_categories  
FOR SELECT
USING (
  is_active = true
  AND auth.uid() IS NOT NULL
);

-- Update content_items policies
DROP POLICY IF EXISTS "Anyone can view approved active content" ON public.content_items;

CREATE POLICY "Authenticated users can view approved active content"
ON public.content_items
FOR SELECT  
USING (
  is_active = true 
  AND approval_status = 'approved'::approval_status
  AND auth.uid() IS NOT NULL
);

-- Update achievements policies
DROP POLICY IF EXISTS "Anyone can view active achievements" ON public.achievements;

CREATE POLICY "Authenticated users can view active achievements"
ON public.achievements
FOR SELECT
USING (
  is_active = true
  AND auth.uid() IS NOT NULL
);