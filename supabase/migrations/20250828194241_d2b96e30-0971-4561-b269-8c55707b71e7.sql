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

-- Insert chore templates with comprehensive details
INSERT INTO public.chore_templates (title, description, category_id, age_min, age_max, difficulty, base_points, estimated_duration, instructions, autism_accommodations, sensory_considerations) VALUES
-- Personal Hygiene Templates
('Brush Teeth', 'Clean teeth with toothbrush and toothpaste', (SELECT id FROM chore_categories WHERE name = 'Personal Hygiene'), 3, 18, 'easy', 5, 3, 
'[{"step": 1, "instruction": "Get your toothbrush and toothpaste", "visual_cue": "toothbrush_icon"}, {"step": 2, "instruction": "Put a pea-sized amount of toothpaste on brush", "visual_cue": "toothpaste_amount"}, {"step": 3, "instruction": "Brush in circles for 2 minutes", "visual_cue": "brushing_motion"}, {"step": 4, "instruction": "Rinse mouth and toothbrush", "visual_cue": "rinse_icon"}]',
'{"timer_support": true, "music_option": true, "visual_schedule": true, "sensory_breaks": false}',
'{"texture": "soft_bristles", "taste": "mild_toothpaste_options", "sound": "quiet_electric_option"}'),

('Wash Hands', 'Clean hands with soap and warm water', (SELECT id FROM chore_categories WHERE name = 'Personal Hygiene'), 2, 18, 'easy', 3, 2,
'[{"step": 1, "instruction": "Turn on warm water", "visual_cue": "faucet_on"}, {"step": 2, "instruction": "Apply soap to hands", "visual_cue": "soap_pump"}, {"step": 3, "instruction": "Rub hands together for 20 seconds", "visual_cue": "hand_rubbing"}, {"step": 4, "instruction": "Rinse with clean water", "visual_cue": "rinse_hands"}, {"step": 5, "instruction": "Dry with clean towel", "visual_cue": "towel_dry"}]',
'{"song_timing": true, "visual_timer": true, "step_checklist": true}',
'{"temperature": "warm_not_hot", "texture": "gentle_soap", "pressure": "light_touch"}'),

-- Getting Dressed Templates  
('Put On Shirt', 'Put on a clean shirt or top', (SELECT id FROM chore_categories WHERE name = 'Getting Dressed'), 3, 12, 'easy', 4, 5,
'[{"step": 1, "instruction": "Choose a clean shirt", "visual_cue": "shirt_selection"}, {"step": 2, "instruction": "Put arms through sleeves", "visual_cue": "arms_through"}, {"step": 3, "instruction": "Pull shirt over head", "visual_cue": "over_head"}, {"step": 4, "instruction": "Pull shirt down to cover tummy", "visual_cue": "pull_down"}]',
'{"clothing_choice": true, "weather_appropriate": true, "independence_focus": true}',
'{"fabric": "comfortable_textures", "fit": "not_too_tight", "tags": "tagless_preferred"}'),

('Match Socks', 'Find and put on matching socks', (SELECT id FROM chore_categories WHERE name = 'Getting Dressed'), 4, 10, 'medium', 6, 8,
'[{"step": 1, "instruction": "Find two socks that match", "visual_cue": "matching_pairs"}, {"step": 2, "instruction": "Sit down to put on socks", "visual_cue": "sitting_position"}, {"step": 3, "instruction": "Put on left sock", "visual_cue": "left_foot"}, {"step": 4, "instruction": "Put on right sock", "visual_cue": "right_foot"}, {"step": 5, "instruction": "Check both socks are on properly", "visual_cue": "check_both"}]',
'{"matching_practice": true, "color_recognition": true, "bilateral_coordination": true}',
'{"texture": "seamless_preferred", "elastic": "not_too_tight", "height": "preferred_length"}'),

-- Bedroom Care Templates
('Make Bed', 'Straighten sheets and arrange pillows', (SELECT id FROM chore_categories WHERE name = 'Bedroom Care'), 5, 18, 'medium', 10, 10,
'[{"step": 1, "instruction": "Pull sheets up to head of bed", "visual_cue": "pull_sheets"}, {"step": 2, "instruction": "Smooth out wrinkles", "visual_cue": "smooth_surface"}, {"step": 3, "instruction": "Place pillow at head of bed", "visual_cue": "pillow_placement"}, {"step": 4, "instruction": "Pull blanket over sheets", "visual_cue": "blanket_over"}]',
'{"visual_guide": true, "quality_standards": "age_appropriate", "independence_building": true}',
'{"physical": "stretching_motions", "visual": "organized_appearance", "achievement": "completed_task"}'),

('Organize Toys', 'Put toys away in proper places', (SELECT id FROM chore_categories WHERE name = 'Bedroom Care'), 3, 15, 'easy', 8, 15,
'[{"step": 1, "instruction": "Gather all toys from floor", "visual_cue": "collect_toys"}, {"step": 2, "instruction": "Sort toys by type", "visual_cue": "sorting_categories"}, {"step": 3, "instruction": "Put each toy in its home", "visual_cue": "proper_places"}, {"step": 4, "instruction": "Check floor is clear", "visual_cue": "clean_floor"}]',
'{"sorting_practice": true, "categorization_skills": true, "ownership_responsibility": true}',
'{"organization": "clear_systems", "visual": "labeled_containers", "motor": "fine_motor_practice"}'),

-- Kitchen Helper Templates
('Set the Table', 'Arrange plates and utensils for family meal', (SELECT id FROM chore_categories WHERE name = 'Kitchen Helper'), 4, 16, 'medium', 12, 12,
'[{"step": 1, "instruction": "Count how many people will eat", "visual_cue": "counting_people"}, {"step": 2, "instruction": "Get plates from cabinet", "visual_cue": "plate_location"}, {"step": 3, "instruction": "Place one plate at each seat", "visual_cue": "plate_placement"}, {"step": 4, "instruction": "Add fork on left, knife on right", "visual_cue": "utensil_placement"}, {"step": 5, "instruction": "Add napkins and cups", "visual_cue": "final_touches"}]',
'{"counting_practice": true, "family_contribution": true, "responsibility_building": true}',
'{"handling": "careful_with_breakables", "placement": "organized_spacing", "contribution": "family_helper"}'),

('Clear Table After Meals', 'Remove dishes and clean table surface', (SELECT id FROM chore_categories WHERE name = 'Kitchen Helper'), 5, 18, 'medium', 10, 10,
'[{"step": 1, "instruction": "Ask if everyone is finished eating", "visual_cue": "check_finished"}, {"step": 2, "instruction": "Carry plates to kitchen counter", "visual_cue": "transport_dishes"}, {"step": 3, "instruction": "Wipe table with damp cloth", "visual_cue": "cleaning_motion"}, {"step": 4, "instruction": "Put chairs back in place", "visual_cue": "chair_arrangement"}]',
'{"family_cooperation": true, "cleaning_skills": true, "responsibility_sequence": true}',
'{"physical": "carrying_safely", "cleaning": "appropriate_pressure", "completion": "tidy_result"}'),

-- Living Areas Templates
('Vacuum Living Room', 'Use vacuum cleaner on carpet and rugs', (SELECT id FROM chore_categories WHERE name = 'Living Areas'), 8, 18, 'hard', 15, 20,
'[{"step": 1, "instruction": "Pick up items from floor", "visual_cue": "clear_floor"}, {"step": 2, "instruction": "Get vacuum from closet", "visual_cue": "vacuum_location"}, {"step": 3, "instruction": "Plug in vacuum", "visual_cue": "power_connection"}, {"step": 4, "instruction": "Vacuum in straight lines", "visual_cue": "vacuum_pattern"}, {"step": 5, "instruction": "Put vacuum away", "visual_cue": "storage_return"}]',
'{"noise_preparation": true, "systematic_approach": true, "safety_awareness": true}',
'{"sound": "noise_warning", "physical": "manageable_weight", "pattern": "organized_coverage"}'),

('Dust Furniture', 'Wipe dust from surfaces with microfiber cloth', (SELECT id FROM chore_categories WHERE name = 'Living Areas'), 6, 18, 'easy', 8, 15,
'[{"step": 1, "instruction": "Get microfiber cloth", "visual_cue": "cleaning_cloth"}, {"step": 2, "instruction": "Start with highest surfaces", "visual_cue": "top_to_bottom"}, {"step": 3, "instruction": "Wipe in circular motions", "visual_cue": "circular_wiping"}, {"step": 4, "instruction": "Check for missed spots", "visual_cue": "quality_check"}]',
'{"systematic_cleaning": true, "attention_to_detail": true, "quality_awareness": true}',
'{"texture": "soft_cloth", "motion": "gentle_pressure", "visual": "clean_surfaces"}'),

-- Pet Care Templates
('Feed Pet', 'Give pet their daily food portion', (SELECT id FROM chore_categories WHERE name = 'Pet Care'), 5, 18, 'easy', 10, 8,
'[{"step": 1, "instruction": "Check if pet food bowl is empty", "visual_cue": "empty_bowl"}, {"step": 2, "instruction": "Measure correct amount of food", "visual_cue": "measuring_cup"}, {"step": 3, "instruction": "Pour food into clean bowl", "visual_cue": "pouring_food"}, {"step": 4, "instruction": "Place bowl in pets feeding area", "visual_cue": "feeding_spot"}]',
'{"routine_building": true, "animal_care": true, "measurement_practice": true}',
'{"responsibility": "caring_for_another", "routine": "daily_consistency", "empathy": "animal_needs"}'),

('Fill Water Bowl', 'Ensure pet has fresh, clean water', (SELECT id FROM chore_categories WHERE name = 'Pet Care'), 4, 18, 'easy', 5, 5,
'[{"step": 1, "instruction": "Check water level in bowl", "visual_cue": "water_level"}, {"step": 2, "instruction": "Empty old water if needed", "visual_cue": "empty_bowl"}, {"step": 3, "instruction": "Rinse bowl with clean water", "visual_cue": "rinsing_bowl"}, {"step": 4, "instruction": "Fill with fresh water", "visual_cue": "filling_fresh"}]',
'{"daily_routine": true, "cleanliness_awareness": true, "pet_health": true}',
'{"care": "animal_welfare", "cleanliness": "fresh_water", "routine": "daily_responsibility"}'),

-- Outdoor Chores Templates
('Water Plants', 'Give water to garden plants and flowers', (SELECT id FROM chore_categories WHERE name = 'Outdoor Chores'), 4, 18, 'easy', 8, 10,
'[{"step": 1, "instruction": "Check which plants need water", "visual_cue": "soil_check"}, {"step": 2, "instruction": "Fill watering can", "visual_cue": "water_filling"}, {"step": 3, "instruction": "Water each plant slowly", "visual_cue": "gentle_watering"}, {"step": 4, "instruction": "Check soil is moist but not soggy", "visual_cue": "moisture_check"}]',
'{"nature_connection": true, "plant_care": true, "observation_skills": true}',
'{"sensory": "water_temperature", "nature": "plant_growth", "responsibility": "living_things"}'),

('Collect Mail', 'Get mail from mailbox and bring inside', (SELECT id FROM chore_categories WHERE name = 'Outdoor Chores'), 6, 18, 'easy', 6, 5,
'[{"step": 1, "instruction": "Walk to mailbox safely", "visual_cue": "path_to_mailbox"}, {"step": 2, "instruction": "Open mailbox carefully", "visual_cue": "mailbox_opening"}, {"step": 3, "instruction": "Take out all mail", "visual_cue": "collecting_mail"}, {"step": 4, "instruction": "Close mailbox and return inside", "visual_cue": "secure_return"}]',
'{"independence_building": true, "safety_awareness": true, "family_contribution": true}',
'{"responsibility": "family_task", "independence": "solo_completion", "safety": "awareness_outdoors"}'),

-- School Prep Templates
('Pack School Bag', 'Organize backpack with needed school items', (SELECT id FROM chore_categories WHERE name = 'School Prep'), 5, 18, 'medium', 12, 15,
'[{"step": 1, "instruction": "Check school schedule for tomorrow", "visual_cue": "schedule_check"}, {"step": 2, "instruction": "Get homework and completed work", "visual_cue": "homework_gathering"}, {"step": 3, "instruction": "Pack books and supplies needed", "visual_cue": "book_packing"}, {"step": 4, "instruction": "Add lunch and water bottle", "visual_cue": "lunch_addition"}, {"step": 5, "instruction": "Put backpack by door", "visual_cue": "ready_position"}]',
'{"preparation_skills": true, "organization_practice": true, "independence_building": true}',
'{"organization": "systematic_packing", "preparation": "next_day_ready", "independence": "self_management"}'),

('Organize School Supplies', 'Sort and arrange pencils, papers, and school materials', (SELECT id FROM chore_categories WHERE name = 'School Prep'), 6, 18, 'easy', 8, 12,
'[{"step": 1, "instruction": "Empty pencil case and desk area", "visual_cue": "clearing_workspace"}, {"step": 2, "instruction": "Sort supplies by type", "visual_cue": "supply_categories"}, {"step": 3, "instruction": "Sharpen pencils that need it", "visual_cue": "pencil_sharpening"}, {"step": 4, "instruction": "Put everything back organized", "visual_cue": "organized_placement"}]',
'{"organization_skills": true, "categorization_practice": true, "school_readiness": true}',
'{"organization": "systematic_sorting", "preparation": "school_success", "independence": "self_organization"}');

-- Insert sample achievements with proper unlock criteria
INSERT INTO public.achievements (name, description, achievement_type, unlock_criteria, point_reward, xp_reward, rarity, icon, is_secret, is_active) VALUES
('First Steps', 'Complete your very first chore!', 'milestone', '{"required_completions": 1, "description": "Complete 1 chore"}', 25, 10, 'common', '👶', false, true),
('Getting Started', 'Complete 5 chores successfully', 'milestone', '{"required_completions": 5, "description": "Complete 5 chores"}', 50, 25, 'common', '🌟', false, true),
('Chore Champion', 'Complete 25 chores - you''re on a roll!', 'milestone', '{"required_completions": 25, "description": "Complete 25 chores"}', 100, 50, 'uncommon', '🏆', false, true),
('Century Club', 'Amazing! Complete 100 chores total', 'milestone', '{"required_completions": 100, "description": "Complete 100 chores"}', 250, 100, 'rare', '💯', false, true),
('Chore Master', 'Incredible dedication! Complete 500 chores', 'milestone', '{"required_completions": 500, "description": "Complete 500 chores"}', 500, 200, 'epic', '👑', false, true),

('Streak Starter', 'Complete chores 3 days in a row', 'streak', '{"required_streak": 3, "description": "Complete chores for 3 consecutive days"}', 75, 30, 'common', '🔥', false, true),
('Week Warrior', 'Complete chores 7 days in a row', 'streak', '{"required_streak": 7, "description": "Complete chores for 7 consecutive days"}', 150, 60, 'uncommon', '⚡', false, true),
('Consistency King', 'Complete chores 14 days in a row', 'streak', '{"required_streak": 14, "description": "Complete chores for 14 consecutive days"}', 300, 120, 'rare', '👑', false, true),
('Unstoppable', 'Complete chores 30 days in a row!', 'streak', '{"required_streak": 30, "description": "Complete chores for 30 consecutive days"}', 600, 250, 'epic', '🚀', false, true),

('Hygiene Hero', 'Complete 10 personal hygiene chores', 'skill', '{"required_completions": 10, "category": "Personal Hygiene", "description": "Complete 10 Personal Hygiene chores"}', 100, 40, 'uncommon', '🧼', false, true),
('Dress Success', 'Complete 10 getting dressed chores', 'skill', '{"required_completions": 10, "category": "Getting Dressed", "description": "Complete 10 Getting Dressed chores"}', 100, 40, 'uncommon', '👕', false, true),
('Room Keeper', 'Complete 10 bedroom care chores', 'skill', '{"required_completions": 10, "category": "Bedroom Care", "description": "Complete 10 Bedroom Care chores"}', 100, 40, 'uncommon', '🛏️', false, true),
('Kitchen Assistant', 'Complete 10 kitchen helper chores', 'skill', '{"required_completions": 10, "category": "Kitchen Helper", "description": "Complete 10 Kitchen Helper chores"}', 100, 40, 'uncommon', '🍽️', false, true),
('House Helper', 'Complete 10 living area chores', 'skill', '{"required_completions": 10, "category": "Living Areas", "description": "Complete 10 Living Areas chores"}', 100, 40, 'uncommon', '🏠', false, true),
('Pet Pal', 'Complete 10 pet care chores', 'skill', '{"required_completions": 10, "category": "Pet Care", "description": "Complete 10 Pet Care chores"}', 100, 40, 'uncommon', '🐕', false, true),
('Outdoor Explorer', 'Complete 10 outdoor chores', 'skill', '{"required_completions": 10, "category": "Outdoor Chores", "description": "Complete 10 Outdoor Chores"}', 100, 40, 'uncommon', '🌱', false, true),
('School Ready', 'Complete 10 school prep chores', 'skill', '{"required_completions": 10, "category": "School Prep", "description": "Complete 10 School Prep chores"}', 100, 40, 'uncommon', '🎒', false, true),

('Team Player', 'Help family members complete their chores', 'collaboration', '{"required_collaborations": 5, "description": "Help with 5 family chores"}', 150, 60, 'uncommon', '🤝', false, true),
('Family Champion', 'Work together on 10 family challenges', 'collaboration', '{"required_family_challenges": 10, "description": "Complete 10 family challenges"}', 200, 80, 'rare', '👨‍👩‍👧‍👦', false, true),

('Speed Demon', 'Complete a chore 50% faster than estimated', 'special', '{"speed_bonus": 0.5, "description": "Complete chore 50% faster than expected"}', 75, 30, 'rare', '💨', false, true),
('Perfectionist', 'Complete 20 chores with perfect quality', 'special', '{"perfect_completions": 20, "description": "Complete 20 chores with perfect quality rating"}', 200, 80, 'rare', '⭐', false, true),
('Early Bird', 'Complete morning chores before 8 AM for 7 days', 'special', '{"early_completions": 7, "before_time": "08:00", "description": "Complete morning chores before 8 AM for 7 days"}', 150, 60, 'uncommon', '🌅', false, true),

('Secret Helper', 'Complete chores without being asked 10 times', 'special', '{"self_motivated": 10, "description": "Complete 10 chores without being reminded"}', 300, 120, 'epic', '🤫', true, true),
('Surprise Star', 'Complete an extra chore that wasn''t assigned', 'special', '{"bonus_chores": 1, "description": "Complete extra chores beyond assignments"}', 100, 50, 'rare', '✨', true, true);