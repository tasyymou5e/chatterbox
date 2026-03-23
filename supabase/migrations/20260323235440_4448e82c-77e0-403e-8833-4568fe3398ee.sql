
-- Insert games for Communication & AAC
INSERT INTO content_items (title, description, content_type, category_id, url, thumbnail_url, age_min, age_max, is_free, is_active, tags, autism_features) VALUES
('AAC Picture Board', 'Interactive picture communication board with customizable symbols for non-verbal expression', 'game', '0098c372-1461-486e-8e99-378b192656b0', '/kids', NULL, 3, 12, true, true, ARRAY['aac','communication','symbols','non-verbal'], '{"visual_supports": true, "reduced_stimulation": true, "clear_instructions": true}'::jsonb),
('Symbol Sentence Builder', 'Build sentences using picture symbols to practice communication skills', 'game', '0098c372-1461-486e-8e99-378b192656b0', '/kids', NULL, 4, 10, true, true, ARRAY['aac','sentence-building','language'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('PECS Practice', 'Practice Picture Exchange Communication System with drag-and-drop activities', 'game', '0098c372-1461-486e-8e99-378b192656b0', '/kids', NULL, 3, 8, true, true, ARRAY['pecs','communication','exchange'], '{"visual_supports": true, "reduced_stimulation": true}'::jsonb),
('Emotion Communicator', 'Express feelings using visual emotion cards and AAC symbols', 'game', '0098c372-1461-486e-8e99-378b192656b0', '/kids', NULL, 3, 12, true, true, ARRAY['emotions','communication','feelings'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),

-- Educational Learning
('Alphabet Adventure', 'Learn letters through interactive matching and tracing activities', 'game', 'acedbe8a-04b4-46f4-a03f-98db9fde566c', '/kids', NULL, 3, 7, true, true, ARRAY['alphabet','letters','literacy'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('Counting Quest', 'Practice counting with fun visual number games and challenges', 'game', 'acedbe8a-04b4-46f4-a03f-98db9fde566c', '/kids', NULL, 3, 8, true, true, ARRAY['counting','numbers','math'], '{"visual_supports": true, "reduced_stimulation": true}'::jsonb),
('Science Explorer', 'Discover planets, weather, and nature through sorting and matching', 'game', 'acedbe8a-04b4-46f4-a03f-98db9fde566c', '/kids', NULL, 5, 12, true, true, ARRAY['science','planets','nature'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('Reading Match', 'Match words to pictures to build reading comprehension skills', 'game', 'acedbe8a-04b4-46f4-a03f-98db9fde566c', '/kids', NULL, 4, 9, true, true, ARRAY['reading','comprehension','vocabulary'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('Shape Sorter', 'Learn shapes and colors through interactive sorting activities', 'game', 'acedbe8a-04b4-46f4-a03f-98db9fde566c', '/kids', NULL, 3, 6, true, true, ARRAY['shapes','colors','sorting'], '{"visual_supports": true, "reduced_stimulation": true}'::jsonb),

-- Social Skills
('Social Story Sequencer', 'Practice social scenarios by putting story events in the right order', 'game', '25caa8f2-3562-4f65-8879-e3451e703d29', '/kids', NULL, 4, 12, true, true, ARRAY['social-stories','sequencing','scenarios'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('Friendship Scenarios', 'Learn appropriate social responses through interactive friendship scenarios', 'game', '25caa8f2-3562-4f65-8879-e3451e703d29', '/kids', NULL, 5, 12, true, true, ARRAY['friendship','social-skills','interaction'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('Behavior Sorter', 'Sort behaviors into appropriate and inappropriate categories', 'game', '25caa8f2-3562-4f65-8879-e3451e703d29', '/kids', NULL, 4, 10, true, true, ARRAY['behavior','social-rules','sorting'], '{"visual_supports": true, "reduced_stimulation": true}'::jsonb),
('Turn-Taking Trainer', 'Practice waiting and taking turns through fun interactive games', 'game', '25caa8f2-3562-4f65-8879-e3451e703d29', '/kids', NULL, 3, 8, true, true, ARRAY['turn-taking','patience','sharing'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),

-- Speech Therapy
('Sound Matcher', 'Match beginning and ending sounds to build phonemic awareness', 'game', 'e484ce9e-6faf-449e-b969-8d1fd19696a2', '/kids', NULL, 3, 8, true, true, ARRAY['phonics','sounds','articulation'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('Mouth Shape Explorer', 'Learn how to form sounds by matching mouth shapes to letters', 'game', 'e484ce9e-6faf-449e-b969-8d1fd19696a2', '/kids', NULL, 3, 10, true, true, ARRAY['articulation','mouth-shapes','speech'], '{"visual_supports": true, "reduced_stimulation": true}'::jsonb),
('Rhyme Finder', 'Find rhyming words through fun matching and sorting activities', 'game', 'e484ce9e-6faf-449e-b969-8d1fd19696a2', '/kids', NULL, 4, 9, true, true, ARRAY['rhyming','phonics','word-play'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('Word Builder', 'Build words by combining syllables and sounds together', 'game', 'e484ce9e-6faf-449e-b969-8d1fd19696a2', '/kids', NULL, 5, 12, true, true, ARRAY['word-building','syllables','spelling'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),

-- Daily Routines
('Visual Schedule Builder', 'Create and follow visual daily schedules with drag-and-drop', 'game', '4c208d71-9f02-4600-bf7d-df9956f198ff', '/kids', NULL, 3, 12, true, true, ARRAY['schedule','routine','visual-support'], '{"visual_supports": true, "reduced_stimulation": true, "clear_instructions": true}'::jsonb),
('Morning Routine Hero', 'Follow step-by-step morning routine activities in the right order', 'game', '4c208d71-9f02-4600-bf7d-df9956f198ff', '/kids', NULL, 3, 8, true, true, ARRAY['morning-routine','sequencing','self-care'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('Bedtime Wind Down', 'Practice a calming bedtime routine with visual prompts', 'game', '4c208d71-9f02-4600-bf7d-df9956f198ff', '/kids', NULL, 3, 10, true, true, ARRAY['bedtime','routine','calming'], '{"visual_supports": true, "reduced_stimulation": true}'::jsonb),

-- Storytelling
('Story Starter', 'Create stories by choosing characters, settings, and actions', 'game', 'ec3d90e6-abeb-4bd9-9961-493ec672fa4b', '/kids', NULL, 4, 12, true, true, ARRAY['storytelling','creativity','narrative'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('Character Match', 'Match characters to their roles in classic story scenarios', 'game', 'ec3d90e6-abeb-4bd9-9961-493ec672fa4b', '/kids', NULL, 4, 10, true, true, ARRAY['characters','matching','stories'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('Plot Sequencer', 'Put story events in the correct order to complete the narrative', 'game', 'ec3d90e6-abeb-4bd9-9961-493ec672fa4b', '/kids', NULL, 5, 12, true, true, ARRAY['sequencing','plot','comprehension'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('Story Detective', 'Find clues and solve story mysteries through reading comprehension', 'game', 'ec3d90e6-abeb-4bd9-9961-493ec672fa4b', '/kids', NULL, 6, 12, true, true, ARRAY['detective','mystery','reading'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),

-- Progress Tracking (using 'app' content_type)
('Achievement Tracker', 'View and celebrate your learning achievements and milestones', 'app', 'c053f952-d0a2-495d-bdd2-b491189a0e7a', '/kids', NULL, 3, 12, true, true, ARRAY['progress','achievements','tracking'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('Star Chart', 'Collect stars and moons by completing learning activities', 'app', 'c053f952-d0a2-495d-bdd2-b491189a0e7a', '/kids', NULL, 3, 12, true, true, ARRAY['rewards','stars','motivation'], '{"visual_supports": true, "reduced_stimulation": true}'::jsonb),
('Skill Tree Explorer', 'Explore your learning journey through an interactive skill tree', 'app', 'c053f952-d0a2-495d-bdd2-b491189a0e7a', '/kids', NULL, 5, 12, true, true, ARRAY['skills','progress','visualization'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),

-- Interactive Games
('Memory Match Challenge', 'Classic memory card matching game with themed picture sets', 'game', 'ac1306e7-5371-4d2b-894d-cb2d6ffe79fe', '/kids', NULL, 3, 12, true, true, ARRAY['memory','matching','cards'], '{"visual_supports": true, "reduced_stimulation": true}'::jsonb),
('Pattern Puzzle', 'Complete visual patterns by finding the missing piece', 'game', 'ac1306e7-5371-4d2b-894d-cb2d6ffe79fe', '/kids', NULL, 4, 12, true, true, ARRAY['patterns','puzzles','logic'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('Color Sorting Fun', 'Sort objects by color in this engaging categorization game', 'game', 'ac1306e7-5371-4d2b-894d-cb2d6ffe79fe', '/kids', NULL, 3, 7, true, true, ARRAY['colors','sorting','categorization'], '{"visual_supports": true, "reduced_stimulation": true}'::jsonb),
('Odd One Out', 'Find the item that does not belong in each group', 'game', 'ac1306e7-5371-4d2b-894d-cb2d6ffe79fe', '/kids', NULL, 4, 10, true, true, ARRAY['logic','categorization','critical-thinking'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),

-- Emotional Regulation
('Emotion Explorer', 'Identify and name emotions through interactive face matching', 'game', '7c01b576-d891-41b4-8f20-189fe7d694ed', '/kids', NULL, 3, 10, true, true, ARRAY['emotions','identification','feelings'], '{"visual_supports": true, "reduced_stimulation": true}'::jsonb),
('Calm Down Corner', 'Learn calming strategies with guided breathing and relaxation activities', 'game', '7c01b576-d891-41b4-8f20-189fe7d694ed', '/kids', NULL, 3, 12, true, true, ARRAY['calming','breathing','regulation'], '{"visual_supports": true, "reduced_stimulation": true}'::jsonb),
('Feelings Thermometer', 'Rate and track your emotions using a visual feelings thermometer', 'game', '7c01b576-d891-41b4-8f20-189fe7d694ed', '/kids', NULL, 4, 12, true, true, ARRAY['feelings','self-awareness','tracking'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('Coping Skills Toolbox', 'Build your personal toolbox of coping strategies for big emotions', 'game', '7c01b576-d891-41b4-8f20-189fe7d694ed', '/kids', NULL, 5, 12, true, true, ARRAY['coping','strategies','self-regulation'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),

-- Cognitive Development
('Brain Trainer', 'Exercise your brain with memory and attention challenges', 'game', '89885841-ec3d-45d9-ac08-12b2c6abadfc', '/kids', NULL, 5, 12, true, true, ARRAY['brain-training','memory','attention'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('Logic Puzzle', 'Solve logic puzzles using deduction and reasoning skills', 'game', '89885841-ec3d-45d9-ac08-12b2c6abadfc', '/kids', NULL, 6, 12, true, true, ARRAY['logic','puzzles','reasoning'], '{"visual_supports": true, "clear_instructions": true}'::jsonb),
('Focus Finder', 'Build attention and focus through visual search activities', 'game', '89885841-ec3d-45d9-ac08-12b2c6abadfc', '/kids', NULL, 4, 10, true, true, ARRAY['attention','focus','visual-search'], '{"visual_supports": true, "reduced_stimulation": true}'::jsonb),
('Sequence Master', 'Complete increasingly complex sequences to train working memory', 'game', '89885841-ec3d-45d9-ac08-12b2c6abadfc', '/kids', NULL, 5, 12, true, true, ARRAY['sequences','memory','cognitive'], '{"visual_supports": true, "clear_instructions": true}'::jsonb);
