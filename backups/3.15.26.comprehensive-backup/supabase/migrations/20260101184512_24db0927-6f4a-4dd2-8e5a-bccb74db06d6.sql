-- Fix RLS policies for content_items - change from RESTRICTIVE to PERMISSIVE
-- This allows admins to see ALL content and regular users to see approved content

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "content_items_admin_all" ON content_items;
DROP POLICY IF EXISTS "content_items_public_select" ON content_items;

-- Create permissive policies (default behavior - OR logic between policies)
-- Admins can do everything
CREATE POLICY "content_items_admin_all" 
  ON content_items 
  FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can read approved and active content
CREATE POLICY "content_items_public_read" 
  ON content_items 
  FOR SELECT 
  USING (
    is_active = true 
    AND approval_status = 'approved'::approval_status
  );