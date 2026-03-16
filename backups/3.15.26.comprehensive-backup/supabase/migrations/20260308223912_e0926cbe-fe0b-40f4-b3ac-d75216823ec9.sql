
-- Seed life_skill_catalog with starter activities
INSERT INTO public.life_skill_catalog (title, description, category, difficulty, age_group, estimated_duration_minutes, tags) VALUES
-- Social skills
('Practice Greeting Others', 'Practice saying hello, making eye contact, and introducing yourself to family members or friends.', 'social', 'beginner', 'child', 10, ARRAY['social-interaction', 'communication']),
('Turn-Taking Game', 'Play a simple board game or card game focusing on waiting for your turn and being patient.', 'social', 'beginner', 'child', 20, ARRAY['patience', 'social-interaction']),
('Emotion Recognition Exercise', 'Look at pictures of faces and identify the emotions being expressed. Discuss what might cause those feelings.', 'social', 'intermediate', 'all', 15, ARRAY['emotional-intelligence', 'empathy']),
('Role-Playing Social Scenarios', 'Practice common social situations like ordering food, asking for help, or joining a group activity.', 'social', 'intermediate', 'all', 20, ARRAY['social-skills', 'confidence']),

-- Communication
('Story Telling Practice', 'Tell a short story about your day using complete sentences. Focus on beginning, middle, and end.', 'communication', 'beginner', 'child', 15, ARRAY['verbal-skills', 'sequencing']),
('Active Listening Exercise', 'Listen to a family member speak for 2 minutes without interrupting, then summarize what they said.', 'communication', 'intermediate', 'all', 10, ARRAY['listening', 'comprehension']),
('Feelings Journal Entry', 'Write or draw about how you are feeling today and what caused those feelings.', 'communication', 'beginner', 'all', 15, ARRAY['self-expression', 'emotional-awareness']),
('Conversation Starter Practice', 'Learn and practice 3 conversation starters to use with peers or colleagues.', 'communication', 'intermediate', 'all', 10, ARRAY['social-skills', 'confidence']),

-- Daily living
('Morning Routine Checklist', 'Complete your morning routine independently: wake up, brush teeth, get dressed, eat breakfast.', 'daily-living', 'beginner', 'child', 30, ARRAY['independence', 'routine']),
('Simple Meal Preparation', 'Prepare a simple snack or meal with minimal supervision (e.g., sandwich, fruit plate).', 'daily-living', 'intermediate', 'all', 20, ARRAY['cooking', 'independence']),
('Organize Personal Space', 'Tidy your room or workspace: make bed, put away clothes, organize desk.', 'daily-living', 'beginner', 'all', 20, ARRAY['organization', 'routine']),
('Money Handling Practice', 'Practice counting money, making change, or planning a small budget for a treat.', 'daily-living', 'intermediate', 'all', 15, ARRAY['math', 'life-skills']),

-- Motor skills
('Fine Motor Activity', 'Practice cutting with scissors, threading beads, or doing a puzzle to strengthen hand coordination.', 'motor', 'beginner', 'child', 15, ARRAY['fine-motor', 'coordination']),
('Outdoor Movement Break', 'Spend 15 minutes doing physical activity: walking, jumping, stretching, or playing catch.', 'motor', 'beginner', 'all', 15, ARRAY['gross-motor', 'exercise']),
('Handwriting or Drawing Practice', 'Practice writing letters, numbers, or drawing simple shapes with focus on control.', 'motor', 'beginner', 'child', 15, ARRAY['fine-motor', 'writing']),
('Balance and Coordination Drill', 'Practice standing on one foot, walking heel-to-toe, or gentle yoga poses.', 'motor', 'intermediate', 'all', 10, ARRAY['balance', 'body-awareness']),

-- Cognitive
('Sequencing Activity', 'Put a set of steps in the correct order (recipe steps, getting ready sequence, story events).', 'cognitive', 'beginner', 'child', 15, ARRAY['sequencing', 'planning']),
('Problem-Solving Puzzle', 'Work on an age-appropriate puzzle, brain teaser, or logic game.', 'cognitive', 'intermediate', 'all', 20, ARRAY['problem-solving', 'focus']),
('Time Management Practice', 'Use a timer to complete a task within a set timeframe. Reflect on time estimation skills.', 'cognitive', 'intermediate', 'all', 15, ARRAY['time-management', 'executive-function']),
('Visual Schedule Creation', 'Create or review a visual schedule for tomorrow, planning activities and transitions.', 'cognitive', 'beginner', 'all', 10, ARRAY['planning', 'organization']),

-- Emotional
('Calm Down Strategy Practice', 'Practice a calming technique: deep breathing, counting to 10, or using a fidget tool.', 'emotional', 'beginner', 'all', 10, ARRAY['self-regulation', 'coping']),
('Gratitude Reflection', 'Name or write down 3 things you are grateful for today.', 'emotional', 'beginner', 'all', 5, ARRAY['mindfulness', 'positivity']),
('Sensory Break', 'Take a planned sensory break: use noise-canceling headphones, squeeze ball, or weighted blanket.', 'emotional', 'beginner', 'all', 10, ARRAY['sensory', 'self-regulation']),
('Mindfulness Minute', 'Practice 5 minutes of guided mindfulness: focus on breathing and body awareness.', 'emotional', 'intermediate', 'all', 5, ARRAY['mindfulness', 'focus']);
