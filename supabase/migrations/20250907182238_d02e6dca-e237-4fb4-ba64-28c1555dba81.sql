-- Phase 2: Family-Based Content Curation & Channels
-- Create family_content_access table for flexible content management
CREATE TABLE family_content_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) NOT NULL,
  content_item_id UUID REFERENCES content_items(id) NOT NULL,
  access_type TEXT DEFAULT 'allowed' CHECK (access_type IN ('allowed', 'blocked', 'featured')),
  added_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_id, content_item_id)
);

-- Enable RLS on new table
ALTER TABLE family_content_access ENABLE ROW LEVEL SECURITY;

-- Create policies for family access
CREATE POLICY "Family members can view content access" 
ON family_content_access FOR SELECT 
USING (is_family_member(family_id, auth.uid()));

CREATE POLICY "Parents can manage content access" 
ON family_content_access FOR ALL 
USING (
  has_role(auth.uid(), 'parent'::app_role) AND 
  is_family_creator(family_id, auth.uid())
);

-- Add trigger for updated_at
CREATE TRIGGER update_family_content_access_updated_at
  BEFORE UPDATE ON family_content_access
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update content_items RLS to consider family access
DROP POLICY IF EXISTS "Authenticated users can view approved active content" ON content_items;

CREATE POLICY "Family members can view accessible content" 
ON content_items FOR SELECT 
USING (
  is_active = true AND 
  approval_status = 'approved'::approval_status AND 
  auth.uid() IS NOT NULL AND
  (
    -- Global content (no family restrictions)
    NOT EXISTS (SELECT 1 FROM family_content_access WHERE content_item_id = content_items.id)
    OR
    -- Family has explicit access and content is not blocked
    EXISTS (
      SELECT 1 FROM family_content_access fca 
      JOIN family_members fm ON fm.family_id = fca.family_id 
      WHERE fca.content_item_id = content_items.id 
      AND fm.user_id = auth.uid() 
      AND fca.access_type IN ('allowed', 'featured')
    )
  )
);

-- Enable realtime for family_content_access
ALTER TABLE family_content_access REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE family_content_access;