-- ============================================================
-- Kids Portal Database Extensions
-- ============================================================

-- 1. Add content_type to family_content_access (if not exists)
ALTER TABLE family_content_access 
ADD COLUMN IF NOT EXISTS content_type VARCHAR(20) DEFAULT 'game' 
CHECK (content_type IN ('game', 'chore', 'task', 'activity'));

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_family_content_access_type 
ON family_content_access(family_id, content_type);

-- 2. Create child_content_preferences table
CREATE TABLE IF NOT EXISTS child_content_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('game', 'chore', 'task', 'activity')),
  is_favorite BOOLEAN DEFAULT false,
  difficulty_preference VARCHAR(20) DEFAULT 'auto' CHECK (difficulty_preference IN ('auto', 'easy', 'medium', 'hard')),
  last_played_at TIMESTAMPTZ,
  play_count INTEGER DEFAULT 0,
  best_score NUMERIC(5,2),
  total_time_spent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, content_id, content_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_child_content_prefs_child ON child_content_preferences(child_id);
CREATE INDEX IF NOT EXISTS idx_child_content_prefs_favorite ON child_content_preferences(child_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_child_content_prefs_recent ON child_content_preferences(child_id, last_played_at DESC);

-- Enable RLS
ALTER TABLE child_content_preferences ENABLE ROW LEVEL SECURITY;

-- Children can manage their own preferences
CREATE POLICY "children_manage_own_preferences" ON child_content_preferences
  FOR ALL USING (child_id = auth.uid())
  WITH CHECK (child_id = auth.uid());

-- Parents can view preferences of children in their family
CREATE POLICY "parents_view_family_preferences" ON child_content_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_members fm1
      JOIN family_members fm2 ON fm1.family_id = fm2.family_id
      WHERE fm1.user_id = auth.uid() 
      AND fm2.user_id = child_content_preferences.child_id
    )
  );

-- Admins can view all preferences
CREATE POLICY "admins_view_all_preferences" ON child_content_preferences
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_child_content_preferences_updated_at
  BEFORE UPDATE ON child_content_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();