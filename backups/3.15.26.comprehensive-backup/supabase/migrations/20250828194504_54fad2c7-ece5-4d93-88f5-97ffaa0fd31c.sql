-- Insert chore categories with autism-friendly features
INSERT INTO public.chore_categories (name, description, icon, color, sort_order, autism_friendly_features) VALUES
('Personal Hygiene', 'Daily self-care routines', '🧼', '#10b981', 1, '{"visual_schedule": true, "step_by_step": true, "timer_friendly": true, "sensory_considerations": ["gentle_reminders", "visual_cues"]}'),
('Getting Dressed', 'Clothing and appearance tasks', '👕', '#f59e0b', 2, '{"visual_schedule": true, "sequence_important": true, "choice_options": true, "sensory_considerations": ["texture_preferences", "weather_appropriate"]}'),
('Bedroom Care', 'Organizing personal space', '🛏️', '#8b5cf6', 3, '{"clear_expectations": true, "before_after_photos": true, "organization_systems": true}'),
('Kitchen Helper', 'Food preparation and cleanup', '🍽️', '#ef4444', 4, '{"safety_first": true, "step_by_step": true, "visual_instructions": true, "sensory_considerations": ["temperature_awareness", "texture_handling"]}'),
('Living Areas', 'Common space maintenance', '🏠', '#06b6d4', 5, '{"clear_boundaries": true, "systematic_approach": true, "family_spaces": true}'),
('Pet Care', 'Animal responsibility tasks', '🐕', '#84cc16', 6, '{"routine_based": true, "empathy_building": true, "responsibility_tracking": true}'),
('Outdoor Chores', 'Garden and exterior tasks', '🌱', '#22c55e', 7, '{"nature_connection": true, "physical_activity": true, "weather_dependent": true, "sensory_rich": true}'),
('School Prep', 'Educational organization', '🎒', '#3b82f6', 8, '{"routine_establishment": true, "independence_building": true, "preparation_focus": true}');

-- Insert initial chore templates
INSERT INTO public.chore_templates (title, description, category_id, age_min, age_max, difficulty, base_points, estimated_duration, instructions, autism_accommodations, sensory_considerations) VALUES
('Brush Teeth', 'Clean teeth with toothbrush and toothpaste', (SELECT id FROM chore_categories WHERE name = 'Personal Hygiene' LIMIT 1), 3, 18, 'easy', 5, 3, 
'[{"step": 1, "instruction": "Get your toothbrush and toothpaste", "visual_cue": "toothbrush_icon"}, {"step": 2, "instruction": "Put a pea-sized amount of toothpaste on brush", "visual_cue": "toothpaste_amount"}, {"step": 3, "instruction": "Brush in circles for 2 minutes", "visual_cue": "brushing_motion"}, {"step": 4, "instruction": "Rinse mouth and toothbrush", "visual_cue": "rinse_icon"}]',
'{"timer_support": true, "music_option": true, "visual_schedule": true, "sensory_breaks": false}',
'{"texture": "soft_bristles", "taste": "mild_toothpaste_options", "sound": "quiet_electric_option"}'),

('Wash Hands', 'Clean hands with soap and warm water', (SELECT id FROM chore_categories WHERE name = 'Personal Hygiene' LIMIT 1), 2, 18, 'easy', 3, 2,
'[{"step": 1, "instruction": "Turn on warm water", "visual_cue": "faucet_on"}, {"step": 2, "instruction": "Apply soap to hands", "visual_cue": "soap_pump"}, {"step": 3, "instruction": "Rub hands together for 20 seconds", "visual_cue": "hand_rubbing"}, {"step": 4, "instruction": "Rinse with clean water", "visual_cue": "rinse_hands"}, {"step": 5, "instruction": "Dry with clean towel", "visual_cue": "towel_dry"}]',
'{"song_timing": true, "visual_timer": true, "step_checklist": true}',
'{"temperature": "warm_not_hot", "texture": "gentle_soap", "pressure": "light_touch"}'),

('Make Bed', 'Straighten sheets and arrange pillows', (SELECT id FROM chore_categories WHERE name = 'Bedroom Care' LIMIT 1), 5, 18, 'medium', 10, 10,
'[{"step": 1, "instruction": "Pull sheets up to head of bed", "visual_cue": "pull_sheets"}, {"step": 2, "instruction": "Smooth out wrinkles", "visual_cue": "smooth_surface"}, {"step": 3, "instruction": "Place pillow at head of bed", "visual_cue": "pillow_placement"}, {"step": 4, "instruction": "Pull blanket over sheets", "visual_cue": "blanket_over"}]',
'{"visual_guide": true, "quality_standards": "age_appropriate", "independence_building": true}',
'{"physical": "stretching_motions", "visual": "organized_appearance", "achievement": "completed_task"}'),

('Set the Table', 'Arrange plates and utensils for family meal', (SELECT id FROM chore_categories WHERE name = 'Kitchen Helper' LIMIT 1), 4, 16, 'medium', 12, 12,
'[{"step": 1, "instruction": "Count how many people will eat", "visual_cue": "counting_people"}, {"step": 2, "instruction": "Get plates from cabinet", "visual_cue": "plate_location"}, {"step": 3, "instruction": "Place one plate at each seat", "visual_cue": "plate_placement"}, {"step": 4, "instruction": "Add fork on left, knife on right", "visual_cue": "utensil_placement"}, {"step": 5, "instruction": "Add napkins and cups", "visual_cue": "final_touches"}]',
'{"counting_practice": true, "family_contribution": true, "responsibility_building": true}',
'{"handling": "careful_with_breakables", "placement": "organized_spacing", "contribution": "family_helper"}'),

('Feed Pet', 'Give pet their daily food portion', (SELECT id FROM chore_categories WHERE name = 'Pet Care' LIMIT 1), 5, 18, 'easy', 10, 8,
'[{"step": 1, "instruction": "Check if pet food bowl is empty", "visual_cue": "empty_bowl"}, {"step": 2, "instruction": "Measure correct amount of food", "visual_cue": "measuring_cup"}, {"step": 3, "instruction": "Pour food into clean bowl", "visual_cue": "pouring_food"}, {"step": 4, "instruction": "Place bowl in pets feeding area", "visual_cue": "feeding_spot"}]',
'{"routine_building": true, "animal_care": true, "measurement_practice": true}',
'{"responsibility": "caring_for_another", "routine": "daily_consistency", "empathy": "animal_needs"}');

-- Insert sample achievements with proper unlock criteria
INSERT INTO public.achievements (name, description, achievement_type, unlock_criteria, point_reward, xp_reward, rarity, icon, is_secret, is_active) VALUES
('First Steps', 'Complete your very first chore!', 'milestone', '{"required_completions": 1, "description": "Complete 1 chore"}', 25, 10, 'common', '👶', false, true),
('Getting Started', 'Complete 5 chores successfully', 'milestone', '{"required_completions": 5, "description": "Complete 5 chores"}', 50, 25, 'common', '🌟', false, true),
('Chore Champion', 'Complete 25 chores - you are on a roll!', 'milestone', '{"required_completions": 25, "description": "Complete 25 chores"}', 100, 50, 'uncommon', '🏆', false, true),
('Streak Starter', 'Complete chores 3 days in a row', 'streak', '{"required_streak": 3, "description": "Complete chores for 3 consecutive days"}', 75, 30, 'common', '🔥', false, true),
('Week Warrior', 'Complete chores 7 days in a row', 'streak', '{"required_streak": 7, "description": "Complete chores for 7 consecutive days"}', 150, 60, 'uncommon', '⚡', false, true),
('Hygiene Hero', 'Master personal care routines', 'skill', '{"required_completions": 10, "category": "Personal Hygiene", "description": "Complete 10 Personal Hygiene chores"}', 100, 40, 'uncommon', '🧼', false, true),
('Room Keeper', 'Keep your space organized', 'skill', '{"required_completions": 10, "category": "Bedroom Care", "description": "Complete 10 Bedroom Care chores"}', 100, 40, 'uncommon', '🛏️', false, true),
('Kitchen Assistant', 'Help with family meals', 'skill', '{"required_completions": 10, "category": "Kitchen Helper", "description": "Complete 10 Kitchen Helper chores"}', 100, 40, 'uncommon', '🍽️', false, true),
('Pet Pal', 'Take great care of pets', 'skill', '{"required_completions": 10, "category": "Pet Care", "description": "Complete 10 Pet Care chores"}', 100, 40, 'uncommon', '🐕', false, true),
('Speed Demon', 'Complete a chore 50% faster than estimated', 'special', '{"speed_bonus": 0.5, "description": "Complete chore 50% faster than expected"}', 75, 30, 'rare', '💨', false, true);