-- First, insert a Math category if it doesn't exist
INSERT INTO content_categories (id, name, description, icon, is_active, sort_order)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Math Games',
  'Interactive math practice games for learning arithmetic',
  '🔢',
  true,
  10
)
ON CONFLICT (id) DO NOTHING;

-- Insert the Subtraction Game as a content item
INSERT INTO content_items (
  id,
  category_id,
  title,
  description,
  url,
  content_type,
  skill_levels,
  is_active,
  is_free,
  approval_status,
  autism_features,
  age_min,
  age_max,
  tags
) VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Subtraction Practice Game',
  'Practice subtraction with adaptive difficulty levels. Earn stars for correct answers and unlock new skill levels!',
  '/games/subtraction-demo',
  'game',
  ARRAY['beginner', 'intermediate', 'advanced'],
  true,
  true,
  'approved',
  '{"visual_supports": true, "reduced_distractions": true, "clear_feedback": true, "predictable_layout": true}'::jsonb,
  5,
  12,
  ARRAY['math', 'subtraction', 'arithmetic', 'practice']
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  url = EXCLUDED.url,
  skill_levels = EXCLUDED.skill_levels,
  is_active = EXCLUDED.is_active,
  approval_status = EXCLUDED.approval_status;