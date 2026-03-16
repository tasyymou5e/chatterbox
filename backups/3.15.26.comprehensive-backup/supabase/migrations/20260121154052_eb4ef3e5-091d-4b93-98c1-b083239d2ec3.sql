-- Insert the three autism-friendly games into content_items with proper UUIDs
INSERT INTO public.content_items (
  id, title, description, url, content_type, 
  age_min, age_max, skill_levels, is_active, is_free,
  autism_features, tags, thumbnail_url, category_id
) VALUES 
(
  'c1a2b3c4-d5e6-7890-abcd-ef1234560001',
  'Memory Match Adventure',
  'Find matching pairs of fun pictures! Practice memory skills with colorful cards featuring animals, shapes, and objects. Self-paced gameplay with visual and audio feedback.',
  '/games/memory-match',
  'game',
  6, 12,
  ARRAY['beginner', 'intermediate', 'advanced'],
  true, true,
  '{"sensory_friendly": true, "visual_supports": true, "clear_instructions": true, "predictable_routines": true, "customizable_pace": true, "progress_visualization": true, "reduced_motion_option": true}'::jsonb,
  ARRAY['memory', 'matching', 'cognitive', 'visual', 'autism-friendly'],
  '/placeholder.svg',
  '89885841-ec3d-45d9-ac08-12b2c6abadfc'
),
(
  'c1a2b3c4-d5e6-7890-abcd-ef1234560002',
  'Pattern Detective',
  'Discover patterns and complete sequences! Learn to recognize and predict patterns with shapes, colors, and pictures. Clear visual feedback and step-by-step guidance.',
  '/games/pattern-match',
  'game',
  6, 12,
  ARRAY['beginner', 'intermediate', 'advanced'],
  true, true,
  '{"sensory_friendly": true, "visual_supports": true, "clear_instructions": true, "executive_function": true, "progress_visualization": true, "predictable_routines": true}'::jsonb,
  ARRAY['pattern', 'sequence', 'logic', 'cognitive', 'autism-friendly'],
  '/placeholder.svg',
  '89885841-ec3d-45d9-ac08-12b2c6abadfc'
),
(
  'c1a2b3c4-d5e6-7890-abcd-ef1234560003',
  'Sound Safari',
  'Listen and match sounds to pictures! Explore animal sounds, musical instruments, and everyday sounds. Volume controls and visual indicators included.',
  '/games/sounds-match',
  'game',
  6, 12,
  ARRAY['beginner', 'intermediate', 'advanced'],
  true, true,
  '{"sensory_friendly": true, "visual_supports": true, "clear_instructions": true, "communication_aids": true, "customizable_pace": true, "audio_controls": true}'::jsonb,
  ARRAY['sounds', 'audio', 'listening', 'matching', 'autism-friendly'],
  '/placeholder.svg',
  '89885841-ec3d-45d9-ac08-12b2c6abadfc'
);