
-- Update existing 24 items with proper skill domains, item types, clinical references, and step-by-step instructions

-- Social items (4 existing)
UPDATE public.life_skill_catalog SET 
  skill_domain = 'social', item_type = 'activity', 
  autism_skill_tags = ARRAY['greeting', 'eye-contact', 'social-initiation'],
  clinical_reference = 'ABA: Social Skills Training; ESDM: Joint Attention',
  step_by_step_instructions = '[{"step":1,"title":"Prepare","description":"Stand facing your practice partner at arm''s length"},{"step":2,"title":"Make Eye Contact","description":"Look at the person''s face and smile"},{"step":3,"title":"Say Hello","description":"Say ''Hi'' or ''Hello'' with a wave"},{"step":4,"title":"Wait for Response","description":"Wait 3 seconds for them to respond"},{"step":5,"title":"Practice Again","description":"Try with a different greeting like ''Good morning''"}]'::jsonb,
  max_duration_minutes = 10
WHERE id = '98e13650-d6e1-4f09-aeed-1a47604273f8';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'social', item_type = 'game',
  autism_skill_tags = ARRAY['turn-taking', 'waiting', 'patience', 'shared-attention'],
  clinical_reference = 'ABA: Discrete Trial Training; TEACCH: Structured Play',
  step_by_step_instructions = '[{"step":1,"title":"Choose a Game","description":"Pick a simple board game or card game"},{"step":2,"title":"Decide Who Goes First","description":"Use a spinner or coin flip"},{"step":3,"title":"Take Your Turn","description":"Do your action, then say ''Your turn''"},{"step":4,"title":"Wait Patiently","description":"Keep hands in lap while waiting"},{"step":5,"title":"Congratulate","description":"Say ''Good job'' after each round"}]'::jsonb,
  max_duration_minutes = 15
WHERE id = '9df1e9d6-ddf2-4190-b213-58f56fe8bc7d';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'social', item_type = 'game',
  autism_skill_tags = ARRAY['emotion-recognition', 'facial-expressions', 'empathy'],
  clinical_reference = 'ABA: Social Cognition; ESDM: Emotional Understanding',
  step_by_step_instructions = '[{"step":1,"title":"Look at Face Cards","description":"Study emotion flashcards one at a time"},{"step":2,"title":"Name the Emotion","description":"Say what feeling the face shows"},{"step":3,"title":"Show the Emotion","description":"Try making the same face in a mirror"},{"step":4,"title":"Tell a Story","description":"Think of a time you felt that way"},{"step":5,"title":"Match Game","description":"Match emotion cards to situation cards"}]'::jsonb,
  max_duration_minutes = 15
WHERE id = '7df6477f-11d0-460f-8351-7947eb812d11';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'social', item_type = 'activity',
  autism_skill_tags = ARRAY['perspective-taking', 'social-scripts', 'role-play'],
  clinical_reference = 'ABA: Behavioral Skills Training; Social Stories (Carol Gray)',
  step_by_step_instructions = '[{"step":1,"title":"Read the Scenario","description":"Read the social situation card together"},{"step":2,"title":"Discuss Options","description":"Talk about what you could do or say"},{"step":3,"title":"Practice the Script","description":"Act out the best response with a partner"},{"step":4,"title":"Switch Roles","description":"Try being the other person in the scenario"},{"step":5,"title":"Reflect","description":"Talk about what felt easy and what was hard"}]'::jsonb,
  max_duration_minutes = 20
WHERE id = '38db5338-ca7a-4259-9ea7-f889b04e3b7a';

-- Communication items (4 existing)
UPDATE public.life_skill_catalog SET 
  skill_domain = 'communication', item_type = 'activity',
  autism_skill_tags = ARRAY['narrative-skills', 'sequencing', 'verbal-expression'],
  clinical_reference = 'ABA: Verbal Behavior; ESDM: Language Development',
  step_by_step_instructions = '[{"step":1,"title":"Pick a Topic","description":"Choose a favorite book, movie, or experience"},{"step":2,"title":"Beginning","description":"Tell what happened first"},{"step":3,"title":"Middle","description":"Tell what happened next"},{"step":4,"title":"End","description":"Tell how it ended"},{"step":5,"title":"Add Details","description":"Add one detail you forgot"}]'::jsonb,
  max_duration_minutes = 15
WHERE id = '0445ff8c-8420-452c-b0f8-ecec68c55c1c';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'communication', item_type = 'activity',
  autism_skill_tags = ARRAY['active-listening', 'comprehension', 'attention'],
  clinical_reference = 'ABA: Listener Responding; TEACCH: Receptive Language',
  step_by_step_instructions = '[{"step":1,"title":"Sit and Face Speaker","description":"Turn your body toward the person talking"},{"step":2,"title":"Listen Without Interrupting","description":"Wait until they finish their sentence"},{"step":3,"title":"Show You''re Listening","description":"Nod your head or say ''uh-huh''"},{"step":4,"title":"Ask a Question","description":"Ask one question about what they said"},{"step":5,"title":"Repeat Back","description":"Tell them what you heard in your own words"}]'::jsonb,
  max_duration_minutes = 10
WHERE id = '78843915-bbfd-4cfa-b81a-278e88734d62';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'emotional_regulation', item_type = 'activity',
  autism_skill_tags = ARRAY['emotional-awareness', 'self-expression', 'journaling'],
  clinical_reference = 'CBT: Emotional Literacy; Zones of Regulation',
  step_by_step_instructions = '[{"step":1,"title":"Check Your Zone","description":"Are you in blue, green, yellow, or red zone?"},{"step":2,"title":"Name the Feeling","description":"Write what emotion you feel right now"},{"step":3,"title":"What Happened?","description":"Write what made you feel this way"},{"step":4,"title":"Draw It","description":"Draw a picture of your feeling"},{"step":5,"title":"Rate It","description":"Rate how strong the feeling is from 1-5"}]'::jsonb,
  max_duration_minutes = 10
WHERE id = '491aab8c-b15a-4ce9-a55b-2555da2fc35f';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'communication', item_type = 'activity',
  autism_skill_tags = ARRAY['conversation-skills', 'initiating', 'reciprocal-communication'],
  clinical_reference = 'ABA: Social Skills; ESDM: Pragmatic Language',
  step_by_step_instructions = '[{"step":1,"title":"Pick a Starter","description":"Choose a conversation topic card"},{"step":2,"title":"Ask the Question","description":"Ask the question to your partner"},{"step":3,"title":"Listen to Answer","description":"Listen without interrupting"},{"step":4,"title":"Follow Up","description":"Ask a follow-up question about their answer"},{"step":5,"title":"Share Your Answer","description":"Answer the same question yourself"}]'::jsonb,
  max_duration_minutes = 10
WHERE id = 'cb1dfb59-ed1f-48f8-89c2-ca975c0088bc';

-- Daily Living items (4 existing)
UPDATE public.life_skill_catalog SET 
  skill_domain = 'daily_living', item_type = 'chore',
  autism_skill_tags = ARRAY['routine', 'independence', 'self-care', 'sequencing'],
  clinical_reference = 'TEACCH: Structured Teaching; ABA: Task Analysis',
  step_by_step_instructions = '[{"step":1,"title":"Wake Up","description":"When alarm goes off, sit up in bed"},{"step":2,"title":"Bathroom","description":"Use the toilet and wash hands"},{"step":3,"title":"Brush Teeth","description":"Put toothpaste on brush, brush for 2 minutes"},{"step":4,"title":"Get Dressed","description":"Put on clothes laid out the night before"},{"step":5,"title":"Eat Breakfast","description":"Sit at table and eat your breakfast"},{"step":6,"title":"Check Backpack","description":"Make sure everything is packed"}]'::jsonb,
  max_duration_minutes = 30
WHERE id = 'fee2da1b-4bfe-42f5-bff7-2cc1c4c1a899';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'daily_living', item_type = 'chore',
  autism_skill_tags = ARRAY['cooking', 'safety', 'following-directions', 'independence'],
  clinical_reference = 'TEACCH: Work Systems; ABA: Chaining',
  step_by_step_instructions = '[{"step":1,"title":"Wash Hands","description":"Wash hands with soap for 20 seconds"},{"step":2,"title":"Gather Ingredients","description":"Get everything you need on the counter"},{"step":3,"title":"Read Recipe","description":"Look at each step of the recipe card"},{"step":4,"title":"Prepare Food","description":"Follow each step carefully"},{"step":5,"title":"Clean Up","description":"Put away ingredients and wipe counters"},{"step":6,"title":"Serve","description":"Put food on a plate and bring to table"}]'::jsonb,
  max_duration_minutes = 25
WHERE id = 'be831779-0aab-4b4b-90b2-7b3c03665529';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'daily_living', item_type = 'chore',
  autism_skill_tags = ARRAY['organization', 'categorizing', 'cleaning', 'independence'],
  clinical_reference = 'TEACCH: Visual Organization; ABA: Task Analysis',
  step_by_step_instructions = '[{"step":1,"title":"Sort Items","description":"Put items into groups: keep, donate, trash"},{"step":2,"title":"Clean Surfaces","description":"Wipe desk, shelf, and table with a cloth"},{"step":3,"title":"Put Things Away","description":"Each item has a home - put it there"},{"step":4,"title":"Make Bed","description":"Pull up sheets and blanket neatly"},{"step":5,"title":"Final Check","description":"Look around - is everything in its place?"}]'::jsonb,
  max_duration_minutes = 20
WHERE id = '7d6aa322-2ffb-4485-9e82-8e477e41d058';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'daily_living', item_type = 'study',
  autism_skill_tags = ARRAY['money', 'math-skills', 'real-world-skills'],
  clinical_reference = 'ABA: Community Skills; TEACCH: Functional Academics',
  step_by_step_instructions = '[{"step":1,"title":"Identify Coins","description":"Name each coin and its value"},{"step":2,"title":"Count Coins","description":"Add up the coins to find the total"},{"step":3,"title":"Practice Paying","description":"Pick an item price and count out the right amount"},{"step":4,"title":"Make Change","description":"Practice giving back the right change"},{"step":5,"title":"Store Practice","description":"Pretend to buy something at a store"}]'::jsonb,
  max_duration_minutes = 15
WHERE id = '4a429322-f4da-4831-aa79-2aaaf59728f6';

-- Motor Skills items (4 existing)
UPDATE public.life_skill_catalog SET 
  skill_domain = 'motor_skills', item_type = 'activity',
  autism_skill_tags = ARRAY['fine-motor', 'hand-strength', 'coordination'],
  clinical_reference = 'OT: Fine Motor Development; ESDM: Motor Planning',
  step_by_step_instructions = '[{"step":1,"title":"Choose Activity","description":"Pick threading beads, playdough, or tweezers"},{"step":2,"title":"Warm Up Hands","description":"Squeeze a stress ball 10 times"},{"step":3,"title":"Do the Activity","description":"Work carefully for 5 minutes"},{"step":4,"title":"Rest","description":"Shake out your hands for 30 seconds"},{"step":5,"title":"Try Again","description":"Continue for 5 more minutes"}]'::jsonb,
  max_duration_minutes = 15
WHERE id = '0a8cf0e6-e89c-4c2a-a355-b7d76b0a7eb6';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'motor_skills', item_type = 'activity',
  autism_skill_tags = ARRAY['gross-motor', 'sensory-input', 'exercise', 'regulation'],
  clinical_reference = 'OT: Sensory Diet; ABA: Physical Activity Programs',
  step_by_step_instructions = '[{"step":1,"title":"Choose Movement","description":"Pick running, jumping, or climbing"},{"step":2,"title":"Warm Up","description":"Do 10 arm circles and 10 toe touches"},{"step":3,"title":"Move for 5 Minutes","description":"Do your chosen movement"},{"step":4,"title":"Water Break","description":"Drink water and rest for 1 minute"},{"step":5,"title":"Cool Down","description":"Walk slowly and take deep breaths"}]'::jsonb,
  max_duration_minutes = 15
WHERE id = '5358227d-5028-4176-952b-307adab20103';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'motor_skills', item_type = 'study',
  autism_skill_tags = ARRAY['handwriting', 'fine-motor', 'visual-motor-integration'],
  clinical_reference = 'OT: Handwriting Without Tears; TEACCH: Visual-Motor',
  step_by_step_instructions = '[{"step":1,"title":"Warm Up","description":"Draw circles and lines on scratch paper"},{"step":2,"title":"Pencil Grip Check","description":"Hold pencil with thumb and two fingers"},{"step":3,"title":"Trace Letters","description":"Trace over dotted letter guides"},{"step":4,"title":"Copy Letters","description":"Write letters on your own below the model"},{"step":5,"title":"Free Draw","description":"Draw a picture using shapes you practiced"}]'::jsonb,
  max_duration_minutes = 15
WHERE id = '6e9d3c61-cda3-4725-8dc4-d74be55c0f2c';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'motor_skills', item_type = 'activity',
  autism_skill_tags = ARRAY['balance', 'coordination', 'body-awareness', 'proprioception'],
  clinical_reference = 'OT: Vestibular-Proprioceptive Activities; SI Theory',
  step_by_step_instructions = '[{"step":1,"title":"Stand on One Foot","description":"Try to balance for 10 seconds each foot"},{"step":2,"title":"Walk the Line","description":"Walk heel-to-toe along a tape line"},{"step":3,"title":"Catch and Throw","description":"Toss a ball back and forth 10 times"},{"step":4,"title":"Obstacle Course","description":"Step over, under, and around objects"},{"step":5,"title":"Cool Down Stretch","description":"Stretch arms, legs, and back gently"}]'::jsonb,
  max_duration_minutes = 15
WHERE id = '463cb203-0c18-438d-8449-9e415b8af22a';

-- Executive Function / Cognitive items (4 existing)
UPDATE public.life_skill_catalog SET 
  skill_domain = 'executive_function', item_type = 'study',
  autism_skill_tags = ARRAY['sequencing', 'ordering', 'logical-thinking'],
  clinical_reference = 'TEACCH: Structured Teaching; ABA: Task Analysis',
  step_by_step_instructions = '[{"step":1,"title":"Look at Pictures","description":"Spread out the sequence cards"},{"step":2,"title":"Find First","description":"Which picture shows what happens first?"},{"step":3,"title":"Put in Order","description":"Arrange all pictures from first to last"},{"step":4,"title":"Tell the Story","description":"Describe what happens in each picture"},{"step":5,"title":"Check Your Work","description":"Does the order make sense?"}]'::jsonb,
  max_duration_minutes = 10
WHERE id = 'e4ae60b1-58ef-4d2c-b413-f43f54212bc7';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'executive_function', item_type = 'game',
  autism_skill_tags = ARRAY['problem-solving', 'critical-thinking', 'flexibility'],
  clinical_reference = 'ABA: Problem Solving; TEACCH: Independent Work',
  step_by_step_instructions = '[{"step":1,"title":"Read the Problem","description":"Look at the puzzle or riddle carefully"},{"step":2,"title":"Think About It","description":"Take 30 seconds to think before trying"},{"step":3,"title":"Try a Solution","description":"Give your best guess or attempt"},{"step":4,"title":"Check Result","description":"Did it work? If not, try another way"},{"step":5,"title":"Celebrate","description":"Great job! Move to the next puzzle"}]'::jsonb,
  max_duration_minutes = 15
WHERE id = '0b5854e3-a393-4711-bc46-6ee110a7ffdd';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'executive_function', item_type = 'study',
  autism_skill_tags = ARRAY['time-management', 'planning', 'self-monitoring'],
  clinical_reference = 'TEACCH: Visual Schedules; CBT: Executive Function Training',
  step_by_step_instructions = '[{"step":1,"title":"List Tasks","description":"Write down 3 things you need to do"},{"step":2,"title":"Estimate Time","description":"Guess how long each task will take"},{"step":3,"title":"Set Timer","description":"Start the timer for the first task"},{"step":4,"title":"Do the Task","description":"Work until the timer goes off"},{"step":5,"title":"Compare","description":"Was your time estimate close? Record the actual time"}]'::jsonb,
  max_duration_minutes = 15
WHERE id = 'b672f12d-f53a-4be6-96b5-1cbd680af0e5';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'executive_function', item_type = 'chore',
  autism_skill_tags = ARRAY['visual-schedules', 'planning', 'organization', 'independence'],
  clinical_reference = 'TEACCH: Visual Supports; ABA: Self-Management',
  step_by_step_instructions = '[{"step":1,"title":"Get Materials","description":"Grab paper, markers, and stickers"},{"step":2,"title":"List Activities","description":"Write down things you do each day"},{"step":3,"title":"Put in Order","description":"Arrange from morning to night"},{"step":4,"title":"Add Pictures","description":"Draw or stick icons next to each activity"},{"step":5,"title":"Post It","description":"Put your schedule where you can see it"}]'::jsonb,
  max_duration_minutes = 20
WHERE id = '99d661ca-5b23-4718-aebb-9e7af5a29fba';

-- Emotional Regulation items (4 existing)
UPDATE public.life_skill_catalog SET 
  skill_domain = 'emotional_regulation', item_type = 'activity',
  autism_skill_tags = ARRAY['self-regulation', 'coping-strategies', 'calming'],
  clinical_reference = 'Zones of Regulation; CBT: Coping Skills',
  step_by_step_instructions = '[{"step":1,"title":"Notice Your Body","description":"Are your muscles tight? Is your heart fast?"},{"step":2,"title":"Name Your Zone","description":"Blue=tired, Green=calm, Yellow=worried, Red=angry"},{"step":3,"title":"Pick a Strategy","description":"Choose: deep breaths, squeeze a ball, or count to 10"},{"step":4,"title":"Do It","description":"Practice your strategy for 1 minute"},{"step":5,"title":"Check Again","description":"How do you feel now? Are you closer to green?"}]'::jsonb,
  max_duration_minutes = 10
WHERE id = '3b72654e-8234-4d7c-9904-2c8f293e6166';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'emotional_regulation', item_type = 'activity',
  autism_skill_tags = ARRAY['gratitude', 'positive-thinking', 'mindfulness'],
  clinical_reference = 'Positive Psychology; CBT: Cognitive Restructuring',
  step_by_step_instructions = '[{"step":1,"title":"Close Eyes","description":"Take 3 deep breaths with eyes closed"},{"step":2,"title":"Think of 3 Good Things","description":"What 3 good things happened today?"},{"step":3,"title":"Write or Draw","description":"Record them in your gratitude journal"},{"step":4,"title":"Why It''s Good","description":"Write why each thing made you happy"},{"step":5,"title":"Share","description":"Tell someone about one good thing"}]'::jsonb,
  max_duration_minutes = 10
WHERE id = 'cfebd0f6-09da-451e-acc1-c4fe1207247e';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'sensory', item_type = 'activity',
  autism_skill_tags = ARRAY['sensory-regulation', 'self-awareness', 'sensory-diet'],
  clinical_reference = 'OT: Sensory Integration Theory; Wilbarger Protocol',
  step_by_step_instructions = '[{"step":1,"title":"Notice Your Body","description":"Do you feel too much or too little energy?"},{"step":2,"title":"Choose Sensory Tool","description":"Pick: weighted blanket, fidget, noise-canceling headphones"},{"step":3,"title":"Use for 5 Minutes","description":"Sit quietly with your sensory tool"},{"step":4,"title":"Deep Breaths","description":"Take 5 slow deep breaths"},{"step":5,"title":"Check In","description":"Do you feel calmer? Rate your energy 1-5"}]'::jsonb,
  max_duration_minutes = 10
WHERE id = 'af5ce2f6-74e6-4305-a906-fe043f2bb3b9';

UPDATE public.life_skill_catalog SET 
  skill_domain = 'emotional_regulation', item_type = 'activity',
  autism_skill_tags = ARRAY['mindfulness', 'breathing', 'focus', 'calming'],
  clinical_reference = 'Mindfulness-Based Stress Reduction; Zones of Regulation',
  step_by_step_instructions = '[{"step":1,"title":"Sit Comfortably","description":"Sit in a comfortable position with feet on floor"},{"step":2,"title":"Close Eyes","description":"Gently close your eyes or look at a spot on the floor"},{"step":3,"title":"Breathe In","description":"Breathe in slowly through your nose for 4 counts"},{"step":4,"title":"Breathe Out","description":"Breathe out slowly through your mouth for 6 counts"},{"step":5,"title":"Notice","description":"Notice how your body feels. Repeat 3 more times"}]'::jsonb,
  max_duration_minutes = 5
WHERE id = '3702ab9c-e351-4b09-8d70-00e08c65fa2e';
