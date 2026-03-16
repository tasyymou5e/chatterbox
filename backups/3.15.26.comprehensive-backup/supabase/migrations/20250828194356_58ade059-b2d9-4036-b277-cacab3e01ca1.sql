-- Insert chore categories with autism-friendly features (use INSERT IGNORE equivalent)
INSERT INTO public.chore_categories (name, description, icon, color, sort_order, autism_friendly_features) VALUES
('Personal Hygiene', 'Daily self-care routines', '🧼', '#10b981', 1, '{"visual_schedule": true, "step_by_step": true, "timer_friendly": true, "sensory_considerations": ["gentle_reminders", "visual_cues"]}'),
('Getting Dressed', 'Clothing and appearance tasks', '👕', '#f59e0b', 2, '{"visual_schedule": true, "sequence_important": true, "choice_options": true, "sensory_considerations": ["texture_preferences", "weather_appropriate"]}'),
('Bedroom Care', 'Organizing personal space', '🛏️', '#8b5cf6', 3, '{"clear_expectations": true, "before_after_photos": true, "organization_systems": true}'),
('Kitchen Helper', 'Food preparation and cleanup', '🍽️', '#ef4444', 4, '{"safety_first": true, "step_by_step": true, "visual_instructions": true, "sensory_considerations": ["temperature_awareness", "texture_handling"]}'),
('Living Areas', 'Common space maintenance', '🏠', '#06b6d4', 5, '{"clear_boundaries": true, "systematic_approach": true, "family_spaces": true}'),
('Pet Care', 'Animal responsibility tasks', '🐕', '#84cc16', 6, '{"routine_based": true, "empathy_building": true, "responsibility_tracking": true}'),
('Outdoor Chores', 'Garden and exterior tasks', '🌱', '#22c55e', 7, '{"nature_connection": true, "physical_activity": true, "weather_dependent": true, "sensory_rich": true}'),
('School Prep', 'Educational organization', '🎒', '#3b82f6', 8, '{"routine_establishment": true, "independence_building": true, "preparation_focus": true}')
ON CONFLICT (name) DO NOTHING;

-- Insert chore templates using explicit category IDs after ensuring categories exist
DO $$
DECLARE
    hygiene_id UUID;
    dress_id UUID;
    bedroom_id UUID;
    kitchen_id UUID;
    living_id UUID;
    pet_id UUID;
    outdoor_id UUID;
    school_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO hygiene_id FROM chore_categories WHERE name = 'Personal Hygiene' LIMIT 1;
    SELECT id INTO dress_id FROM chore_categories WHERE name = 'Getting Dressed' LIMIT 1;
    SELECT id INTO bedroom_id FROM chore_categories WHERE name = 'Bedroom Care' LIMIT 1;
    SELECT id INTO kitchen_id FROM chore_categories WHERE name = 'Kitchen Helper' LIMIT 1;
    SELECT id INTO living_id FROM chore_categories WHERE name = 'Living Areas' LIMIT 1;  
    SELECT id INTO pet_id FROM chore_categories WHERE name = 'Pet Care' LIMIT 1;
    SELECT id INTO outdoor_id FROM chore_categories WHERE name = 'Outdoor Chores' LIMIT 1;
    SELECT id INTO school_id FROM chore_categories WHERE name = 'School Prep' LIMIT 1;

    -- Insert chore templates
    INSERT INTO public.chore_templates (title, description, category_id, age_min, age_max, difficulty, base_points, estimated_duration, instructions, autism_accommodations, sensory_considerations) VALUES
    -- Personal Hygiene Templates
    ('Brush Teeth', 'Clean teeth with toothbrush and toothpaste', hygiene_id, 3, 18, 'easy', 5, 3, 
    '[{"step": 1, "instruction": "Get your toothbrush and toothpaste", "visual_cue": "toothbrush_icon"}, {"step": 2, "instruction": "Put a pea-sized amount of toothpaste on brush", "visual_cue": "toothpaste_amount"}, {"step": 3, "instruction": "Brush in circles for 2 minutes", "visual_cue": "brushing_motion"}, {"step": 4, "instruction": "Rinse mouth and toothbrush", "visual_cue": "rinse_icon"}]',
    '{"timer_support": true, "music_option": true, "visual_schedule": true, "sensory_breaks": false}',
    '{"texture": "soft_bristles", "taste": "mild_toothpaste_options", "sound": "quiet_electric_option"}'),

    ('Wash Hands', 'Clean hands with soap and warm water', hygiene_id, 2, 18, 'easy', 3, 2,
    '[{"step": 1, "instruction": "Turn on warm water", "visual_cue": "faucet_on"}, {"step": 2, "instruction": "Apply soap to hands", "visual_cue": "soap_pump"}, {"step": 3, "instruction": "Rub hands together for 20 seconds", "visual_cue": "hand_rubbing"}, {"step": 4, "instruction": "Rinse with clean water", "visual_cue": "rinse_hands"}, {"step": 5, "instruction": "Dry with clean towel", "visual_cue": "towel_dry"}]',
    '{"song_timing": true, "visual_timer": true, "step_checklist": true}',
    '{"temperature": "warm_not_hot", "texture": "gentle_soap", "pressure": "light_touch"}'),

    -- Getting Dressed Templates  
    ('Put On Shirt', 'Put on a clean shirt or top', dress_id, 3, 12, 'easy', 4, 5,
    '[{"step": 1, "instruction": "Choose a clean shirt", "visual_cue": "shirt_selection"}, {"step": 2, "instruction": "Put arms through sleeves", "visual_cue": "arms_through"}, {"step": 3, "instruction": "Pull shirt over head", "visual_cue": "over_head"}, {"step": 4, "instruction": "Pull shirt down to cover tummy", "visual_cue": "pull_down"}]',
    '{"clothing_choice": true, "weather_appropriate": true, "independence_focus": true}',
    '{"fabric": "comfortable_textures", "fit": "not_too_tight", "tags": "tagless_preferred"}'),

    ('Match Socks', 'Find and put on matching socks', dress_id, 4, 10, 'medium', 6, 8,
    '[{"step": 1, "instruction": "Find two socks that match", "visual_cue": "matching_pairs"}, {"step": 2, "instruction": "Sit down to put on socks", "visual_cue": "sitting_position"}, {"step": 3, "instruction": "Put on left sock", "visual_cue": "left_foot"}, {"step": 4, "instruction": "Put on right sock", "visual_cue": "right_foot"}, {"step": 5, "instruction": "Check both socks are on properly", "visual_cue": "check_both"}]',
    '{"matching_practice": true, "color_recognition": true, "bilateral_coordination": true}',
    '{"texture": "seamless_preferred", "elastic": "not_too_tight", "height": "preferred_length"}'),

    -- Bedroom Care Templates
    ('Make Bed', 'Straighten sheets and arrange pillows', bedroom_id, 5, 18, 'medium', 10, 10,
    '[{"step": 1, "instruction": "Pull sheets up to head of bed", "visual_cue": "pull_sheets"}, {"step": 2, "instruction": "Smooth out wrinkles", "visual_cue": "smooth_surface"}, {"step": 3, "instruction": "Place pillow at head of bed", "visual_cue": "pillow_placement"}, {"step": 4, "instruction": "Pull blanket over sheets", "visual_cue": "blanket_over"}]',
    '{"visual_guide": true, "quality_standards": "age_appropriate", "independence_building": true}',
    '{"physical": "stretching_motions", "visual": "organized_appearance", "achievement": "completed_task"}'),

    ('Organize Toys', 'Put toys away in proper places', bedroom_id, 3, 15, 'easy', 8, 15,
    '[{"step": 1, "instruction": "Gather all toys from floor", "visual_cue": "collect_toys"}, {"step": 2, "instruction": "Sort toys by type", "visual_cue": "sorting_categories"}, {"step": 3, "instruction": "Put each toy in its home", "visual_cue": "proper_places"}, {"step": 4, "instruction": "Check floor is clear", "visual_cue": "clean_floor"}]',
    '{"sorting_practice": true, "categorization_skills": true, "ownership_responsibility": true}',
    '{"organization": "clear_systems", "visual": "labeled_containers", "motor": "fine_motor_practice"}');

END $$;