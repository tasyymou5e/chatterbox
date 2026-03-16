/**
 * Assessment Instruments Data
 * 
 * Contains all questions for 3 clinical ASD assessment tools:
 * 1. ATEC - Autism Treatment Evaluation Checklist
 * 2. DSM-5 Semi-Structured Interview (Spek)
 * 3. DSM-5-TR Clinician Interview
 */

export type AnswerOption = {
  label: string;
  value: number;
};

export type Question = {
  id: string;
  text: string;
  options: AnswerOption[];
};

export type Category = {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
};

export type ScoringRule = {
  type: 'sum' | 'average' | 'criteria_met' | 'severity_average';
  gradeRanges?: { min: number; max: number; grade: string; label: string }[];
  criteriaThreshold?: number; // for DSM-5: how many criteria needed
};

export type AssessmentInstrument = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  disclaimer: string;
  categories: Category[];
  scoring: Record<string, ScoringRule>;
  overallScoring: ScoringRule;
};

// ========== OPTION SETS ==========
const NSV: AnswerOption[] = [
  { label: 'Not true (N)', value: 0 },
  { label: 'Somewhat true (S)', value: 1 },
  { label: 'Very true (V)', value: 2 },
];

const NMMS: AnswerOption[] = [
  { label: 'Not a problem (N)', value: 0 },
  { label: 'Minor problem (MI)', value: 1 },
  { label: 'Moderate problem (MO)', value: 2 },
  { label: 'Serious problem (S)', value: 3 },
];

const YES_NO: AnswerOption[] = [
  { label: 'Yes', value: 1 },
  { label: 'No', value: 0 },
];

const SEVERITY_0_3: AnswerOption[] = [
  { label: '0 – Does not apply', value: 0 },
  { label: '1 – Low', value: 1 },
  { label: '2 – Medium', value: 2 },
  { label: '3 – High', value: 3 },
];

const SEVERITY_1_3: AnswerOption[] = [
  { label: 'Level 1 – Requiring support', value: 1 },
  { label: 'Level 2 – Requiring substantial support', value: 2 },
  { label: 'Level 3 – Requiring very substantial support', value: 3 },
];

// ========== ATEC ==========
const atecSpeech: Question[] = [
  'Knows own name', "Responds to 'No' or 'Stop'", 'Can follow some commands',
  'Can use one word at a time (No!, Eat, Water, etc.)', 'Can use 2 words at a time (Don\'t want, Go home)',
  'Can use 3 words at a time (Want more milk)', 'Knows 10 or more words',
  'Can use sentences with 4 or more words', 'Explains what he/she wants',
  'Asks meaningful questions', 'Speech tends to be meaningful/relevant',
  'Often uses several successive sentences', 'Carries on fairly good conversation',
  'Has normal ability to communicate for his/her age',
].map((text, i) => ({ id: `atec_s1_${i + 1}`, text, options: NSV }));

const atecSociability: Question[] = [
  'Seems to be in a shell – you cannot reach him/her', 'Ignores other people',
  'Pays little or no attention when addressed', 'Uncooperative and resistant',
  'No eye contact', 'Prefers to be left alone', 'Shows no affection',
  'Fails to greet parents', 'Avoids contact with others', 'Does not imitate',
  'Dislikes being held/cuddled', 'Does not share or show', "Does not wave 'bye bye'",
  'Disagreeable/not compliant', 'Temper tantrums', 'Lacks friends/companions',
  'Rarely smiles', "Insensitive to other's feelings", 'Indifferent to being liked',
  'Indifferent if parent(s) leave',
].map((text, i) => ({ id: `atec_s2_${i + 1}`, text, options: NSV }));

const atecSensory: Question[] = [
  'Responds to own name', 'Responds to praise', 'Looks at people and animals',
  'Looks at pictures (and T.V.)', 'Does drawing, coloring, art', 'Plays with toys appropriately',
  'Appropriate facial expression', 'Understands stories on T.V.', 'Understands explanations',
  'Aware of environment', 'Aware of danger', 'Shows imagination', 'Initiates activities',
  'Dresses self', 'Curious, interested', 'Venturesome – explores',
  '"Tuned in" — Not spacey', 'Looks where others are looking',
].map((text, i) => ({ id: `atec_s3_${i + 1}`, text, options: NSV }));

const atecHealth: Question[] = [
  'Bed-wetting', 'Wets pants/diapers', 'Soils pants/diapers', 'Diarrhea',
  'Constipation', 'Sleep problems', 'Eats too much/too little', 'Extremely limited diet',
  'Hyperactive', 'Lethargic', 'Hits or injures self', 'Hits or injures others',
  'Destructive', 'Sound-sensitive', 'Anxious/fearful', 'Unhappy/crying', 'Seizures',
  'Obsessive speech', 'Rigid routines', 'Shouts or screams', 'Demands sameness',
  'Often agitated', 'Not sensitive to pain', '"Hooked" or fixated on certain objects/topics',
  'Repetitive movements (stimming, rocking, etc.)',
].map((text, i) => ({ id: `atec_s4_${i + 1}`, text, options: NMMS }));

export const atecInstrument: AssessmentInstrument = {
  id: 'atec',
  name: 'Autism Treatment Evaluation Checklist (ATEC)',
  shortName: 'ATEC',
  description: 'A 77-item checklist designed to measure the effects of autism treatment across 4 subscales: Speech/Language, Sociability, Sensory/Cognitive Awareness, and Health/Physical/Behavior.',
  disclaimer: 'This checklist is for evaluation purposes only and is not a diagnostic tool. Results should be reviewed by a qualified professional. Copyright © 2016 Autism Research Institute.',
  categories: [
    { id: 'speech', name: 'I. Speech/Language/Communication', description: 'Rate each item: Not true, Somewhat true, or Very true', questions: atecSpeech },
    { id: 'sociability', name: 'II. Sociability', description: 'Rate each item: Not true, Somewhat true, or Very true', questions: atecSociability },
    { id: 'sensory', name: 'III. Sensory/Cognitive Awareness', description: 'Rate each item: Not true, Somewhat true, or Very true', questions: atecSensory },
    { id: 'health', name: 'IV. Health/Physical/Behavior', description: 'Rate each item from Not a problem to Serious problem', questions: atecHealth },
  ],
  scoring: {
    speech: {
      type: 'sum',
      gradeRanges: [
        { min: 0, max: 2, grade: 'A', label: 'Minimal concerns' },
        { min: 3, max: 7, grade: 'B', label: 'Mild concerns' },
        { min: 8, max: 14, grade: 'C', label: 'Moderate concerns' },
        { min: 15, max: 28, grade: 'D', label: 'Significant concerns' },
      ],
    },
    sociability: {
      type: 'sum',
      gradeRanges: [
        { min: 0, max: 3, grade: 'A', label: 'Minimal concerns' },
        { min: 4, max: 10, grade: 'B', label: 'Mild concerns' },
        { min: 11, max: 20, grade: 'C', label: 'Moderate concerns' },
        { min: 21, max: 40, grade: 'D', label: 'Significant concerns' },
      ],
    },
    sensory: {
      type: 'sum',
      gradeRanges: [
        { min: 0, max: 4, grade: 'A', label: 'Minimal concerns' },
        { min: 5, max: 12, grade: 'B', label: 'Mild concerns' },
        { min: 13, max: 22, grade: 'C', label: 'Moderate concerns' },
        { min: 23, max: 36, grade: 'D', label: 'Significant concerns' },
      ],
    },
    health: {
      type: 'sum',
      gradeRanges: [
        { min: 0, max: 5, grade: 'A', label: 'Minimal concerns' },
        { min: 6, max: 15, grade: 'B', label: 'Mild concerns' },
        { min: 16, max: 30, grade: 'C', label: 'Moderate concerns' },
        { min: 31, max: 75, grade: 'D', label: 'Significant concerns' },
      ],
    },
  },
  overallScoring: {
    type: 'sum',
    gradeRanges: [
      { min: 0, max: 15, grade: 'A', label: 'Not likely ASD' },
      { min: 16, max: 40, grade: 'B', label: 'Mild ASD traits' },
      { min: 41, max: 79, grade: 'C', label: 'Moderate ASD traits' },
      { min: 80, max: 179, grade: 'D', label: 'Severe ASD traits' },
    ],
  },
};

// ========== DSM-5 Semi-Structured Interview ==========
const dsm5CriterionA: Question[] = [
  {
    id: 'dsm5_a1',
    text: 'Criterion 1: Deficiencies in social-emotional reciprocity — Includes limitations in conversations, reading and comforting others, sharing of interests/feelings/affection, and initiative for contact.',
    options: YES_NO,
  },
  {
    id: 'dsm5_a2',
    text: 'Criterion 2: Deficiencies in non-verbal communicative behavior — Includes eye contact, body language/facial expression, and integration of verbal and non-verbal communication.',
    options: YES_NO,
  },
  {
    id: 'dsm5_a3',
    text: 'Criterion 3: Deficiencies in developing, maintaining, and understanding relationships — Includes developing friendships, fitting in during social contexts, fantasy games, and language use in social situations.',
    options: YES_NO,
  },
];

const dsm5CriterionB: Question[] = [
  {
    id: 'dsm5_b1',
    text: 'Criterion 1: Stereotypical repetitive motorical motions, use of objects or speech — Includes simple motor stereotypes, stereotypical use of objects, and stereotypical speech.',
    options: YES_NO,
  },
  {
    id: 'dsm5_b2',
    text: 'Criterion 2: Stubbornly holding on to the same things, inflexible attachment to routines — Includes difficulty with changes/transitions, rigid thought patterns, and behavioral rituals.',
    options: YES_NO,
  },
  {
    id: 'dsm5_b3',
    text: 'Criterion 3: Very limited, fixed interests that are abnormally intense or focused — Includes far-reaching interests, attachment to unusual objects.',
    options: YES_NO,
  },
  {
    id: 'dsm5_b4',
    text: 'Criterion 4: Hyper or hypo reactivity to sensory stimuli — Includes hearing, sight, feeling/touch, smell, taste, low sensitivity for stimuli, and unusual interest in stimuli.',
    options: YES_NO,
  },
];

const dsm5Severity: Question[] = [
  {
    id: 'dsm5_sev_a',
    text: 'Level of severity for Social Communication (Criterion Group A)',
    options: SEVERITY_1_3,
  },
  {
    id: 'dsm5_sev_b',
    text: 'Level of severity for Restricted, Repetitive Behaviors (Criterion Group B)',
    options: SEVERITY_1_3,
  },
];

const dsm5Additional: Question[] = [
  {
    id: 'dsm5_c',
    text: 'C: Symptoms were present in the early developmental period (may not become fully manifest until social demands exceed limited capacities, or may be masked by learned strategies)',
    options: YES_NO,
  },
  {
    id: 'dsm5_d',
    text: 'D: Symptoms cause clinically significant impairment in social, occupational, or other important areas of current functioning',
    options: YES_NO,
  },
  {
    id: 'dsm5_e',
    text: 'E: These disturbances are NOT better explained by intellectual disability or global developmental delay',
    options: YES_NO,
  },
];

export const dsm5InterviewInstrument: AssessmentInstrument = {
  id: 'dsm5_interview',
  name: 'DSM-5 Semi-Structured Interview for ASD (Spek)',
  shortName: 'DSM-5 Interview',
  description: 'A semi-structured interview based on DSM-5 criteria to assess the presence of autism spectrum disorder. Developed by Dr. A.A. Spek.',
  disclaimer: 'This interview should be administered by a qualified clinician. Meeting criteria on this interview alone does not constitute a diagnosis. A comprehensive evaluation by a licensed professional is required.',
  categories: [
    { id: 'criterion_a', name: 'Criterion Group A: Social Communication', description: 'Must meet ALL 3 criteria. Persistent deficiencies in social communication and social interaction.', questions: dsm5CriterionA },
    { id: 'criterion_b', name: 'Criterion Group B: Restricted/Repetitive Behaviors', description: 'Must meet at least 2 of 4 criteria. Limited, repetitive thought patterns, interests, or activities.', questions: dsm5CriterionB },
    { id: 'severity', name: 'Severity Levels', description: 'Rate the severity level for each criterion group.', questions: dsm5Severity },
    { id: 'additional', name: 'Additional Criteria (C, D, E)', description: 'These conditions must also be met for a diagnosis.', questions: dsm5Additional },
  ],
  scoring: {
    criterion_a: { type: 'criteria_met', criteriaThreshold: 3 },
    criterion_b: { type: 'criteria_met', criteriaThreshold: 2 },
    severity: { type: 'average' },
    additional: { type: 'criteria_met', criteriaThreshold: 3 },
  },
  overallScoring: {
    type: 'criteria_met',
    gradeRanges: [
      { min: 0, max: 0, grade: 'Not Met', label: 'Criteria not met for ASD' },
      { min: 1, max: 1, grade: 'Met', label: 'Criteria met for ASD' },
    ],
  },
};

// ========== DSM-5-TR Clinician Interview ==========
const dsm5trA1: Question[] = [
  'Do you find it hard to approach others about things you would like or need to discuss with them?',
  'Do you have difficulty entering into a social group or conversation?',
  "Do you struggle with knowing when it's your turn to talk?",
  'Do you frequently interrupt others in conversations?',
  'Do you frequently leave unusually long pauses in conversations?',
  'Do you find yourself having one-sided conversations in which you are doing most of the talking?',
  'Do you get easily bored when someone wants to talk about a subject that does not interest you?',
  'Do you find it hard to engage in small talk?',
  'Do you see conversations primarily as a way to exchange information rather than to emotionally connect with people?',
  'Do you find it hard to explain something in a different way, if someone does not understand you the first time?',
  'Do you find it hard to get excited when someone else shares news of an exciting experience they had?',
  "Does praise make you uncomfortable because you're unsure how to respond and you are feeling judged?",
  "Do you find that you don't enjoy social interactions in the way others seem to enjoy them?",
  'Do you have an aversion to physical affection?',
  'Do you have an aversion to other types of typically pleasurable physical contact, such as a handshake or hug?',
  'Do you find it difficult to ask for help from others?',
].map((text, i) => ({ id: `dsm5tr_a1_${i + 1}`, text, options: SEVERITY_0_3 }));

const dsm5trA2: Question[] = [
  'Do you have trouble coordinating eye contact during conversation?',
  'Do you have trouble coordinating gestures or other body language during conversation?',
  'Have you been told that your facial expressions are inappropriate for the situation or do not match your feelings?',
  "Have others told you that your facial expressions often look angry, depressed or blank, even though you don't feel that way?",
  'Have you been told that you stare at people inappropriately?',
  'Do you have difficulty smiling for photos or otherwise putting on an appropriate facial expression "on demand"?',
  'Do you find making eye contact uncomfortable, difficult or even painful?',
  'When talking to others, do you tend to look or face away from them under certain conditions?',
  'Have you been told that you often speak too loudly, too softly, or too quickly?',
  'Do you find yourself imitating the accents or speech patterns of the person you are talking to?',
  'Have you been told that your speech is flat or monotonous?',
  "Have others described you as cold, detached, or bored, when you weren't feeling that way?",
  "Do you have difficulty reading other people's facial expressions or body language?",
  'Do you have difficulty recognising sarcasm?',
].map((text, i) => ({ id: `dsm5tr_a2_${i + 1}`, text, options: SEVERITY_0_3 }));

const dsm5trA3: Question[] = [
  'Do you find it difficult to judge how another person is feeling about you?',
  'Do you have trouble judging how another person is reacting to your words and actions?',
  'Do you often miss social cues that others seem to easily understand?',
  'Do you laugh or smile at the wrong time?',
  "Have you been told you're aloof, withdrawn, or in your own world?",
  'Do you have a lower than average need for social interaction?',
  'Do you often prefer solitary activities or spending time alone?',
  'Do you find interacting with people who are much younger or older than you, easier than interacting with your age peers?',
  'Do you find it difficult to make new friends?',
  'Do you struggle with maintaining friendships?',
  'Do you prefer to have just one or two friends at a time?',
  "Do you wish you had more friends but don't know how to establish relationships?",
  'Do you have distant or strained relationships with family members, especially for reasons you find hard to understand?',
  'Do you find it hard to tell if someone is teasing or mocking you?',
  "Do you have trouble figuring out when someone wants you to do something, if they don't especially or directly tell you?",
  'Do you prefer one-to-one interaction over group interaction?',
  'Do you sometimes avoid or ignore people who want to interact with you?',
  'Do you find it hard to understand the unwritten rules of social interaction?',
  'Do you rely on scripted speech or imitating others in social interactions?',
  "Do you have difficulty in reacting in expected ways to another person's distress?",
  "Do you find it hard to judge when it's ok to join a group activity or a conversation?",
  "Do others tell you that you're insensitive?",
  "Do others tell you that you don't seem to notice their feelings?",
  'Do others call you selfish because you only seem to be thinking of yourself in certain situations?',
  'Are you often surprised when another person tells you what they were really thinking, after a misunderstanding?',
].map((text, i) => ({ id: `dsm5tr_a3_${i + 1}`, text, options: SEVERITY_0_3 }));

const dsm5trB1: Question[] = [
  'Do you repeat words, phrases or longer passages of speech that you\'ve heard (either immediately or a long time after)?',
  'Do you have a large vocabulary?',
  'Do you have a strong preference for very exact use of words?',
  'Do you often use unusually formal words or speech structure?',
  'Do you have some phrases that you use frequently, even when they are not exactly appropriate?',
  "Do you use a lot of metaphors, especially ones that you've made up?",
  'Are there aspects of your speech that others find hard to understand until they get to know you?',
  'Do you sometimes feel the need to repeatedly talk about the same subject, even when the other person has asked you to stop?',
  'Do you perform soothing repetitive hand movements, like flapping your hands or flicking your fingers?',
  'Do you perform whole body movements like rocking, bouncing, walking on your toes, or spinning?',
  'Do you repeatedly pick at your skin or scalp?',
  'Do you like to sit, stand or otherwise position yourself in unusual ways?',
  'Have you been told that you make unusual facial expressions (e.g. grimaces) repeatedly?',
].map((text, i) => ({ id: `dsm5tr_b1_${i + 1}`, text, options: SEVERITY_0_3 }));

const dsm5trB2: Question[] = [
  'Do you sometimes feel the need to repeatedly ask the same questions, even after your question has been answered?',
  'Do you need to say a particular thing in a certain way at certain times?',
  'Do you need to have other people always answer certain questions in specific ways?',
  'Do you have compulsive behaviours, like always touching the door jamb before entering a room?',
  'Do you find it hard to understand certain types of humour?',
  'Do you have difficulty understanding non-literal types of speech such as irony, sarcasm, or symbolism?',
  'Do you find it hard to end one activity and begin another?',
  'Do you struggle to begin or complete self-care tasks, even when you know that a task is essential or overdue?',
  'Do other people tell you that you over-react to small changes in plans or your environment?',
  'Do you have a lot of routines that you rely on to get through the day?',
  'Do you get upset when someone or something disrupts one of your routines?',
  'Do you have routines that other people think are unusual?',
  'Do you have routines that no one else seems to do?',
  'Have you been told that your style of thinking is "black and white" or "all or nothing"?',
  "Do you have trouble seeing other people's point of view in a discussion or argument?",
  "Do you find it hard to apologise or admit that you're wrong after taking a strong stance?",
  'Do you have a lot of rules that you like to follow?',
  'Do you expect others to follow your rules?',
  "Do other people tell you that you're controlling or bossy?",
  'Do you get frustrated by things that are not clearly defined?',
  'Do you find open ended questions hard to answer?',
  'Do you often have trouble changing your mind or adjusting your plans if presented with new information?',
].map((text, i) => ({ id: `dsm5tr_b2_${i + 1}`, text, options: SEVERITY_0_3 }));

const dsm5trB3: Question[] = [
  "Do you tend to get obsessed with certain topics, sometimes for reasons you can't explain?",
  'When you are interested in a topic, does it seem to take over many aspects of your life?',
  "Do you have an object that you like to have with you at all times – especially something that's unusual for your age?",
  'Do you find that you naturally focus more on details of things, rather than the whole?',
  'Do you have interests that are unusually intense compared to your peers?',
  'Do you have highly unusual interests?',
  'Do you have a narrow range of interests?',
  'Does your leisure time always focus on just one or two activities or topics?',
  'Do you have a passion for numbers, letters, words, or symbols?',
  'Do you consider yourself, or have you been told, that you are a perfectionist?',
  'Do you like to collect and/or categorise items?',
  'Do you have large collections of factual knowledge in a specific category?',
  'Do you see patterns and systems in things?',
].map((text, i) => ({ id: `dsm5tr_b3_${i + 1}`, text, options: SEVERITY_0_3 }));

const dsm5trB4: Question[] = [
  'Do you prefer certain textures?',
  'Do you find certain textures hard to tolerate?',
  'Do you find that textures, features or styles of clothing that don\'t bother others are irritating or even upsetting to you?',
  'Do you find showers, haircuts or other common self-care tasks physically uncomfortable or painful?',
  'Are you unusually sensitive to any light touch on your skin?',
  "Do you notice physical sensations that others don't seem to notice?",
  'Are you unusually sensitive to heat or cold?',
  'Are you easily startled by loud sounds, or do you find certain sounds painful?',
  'Do you have unusually sensitive hearing?',
  "Do you often hear sounds that others don't notice?",
  'Do you have difficulty following conversations when there is a lot of background noise?',
  'Do you find a certain type or intensity of light painful or hard to tolerate?',
  "Are you unusually sensitive to specific smells, often to the point that you'll become physically ill?",
  'Do you find it impossible to eat certain types of foods due to their unpleasant taste or texture?',
  'Do you sometimes become physically ill around certain types of sensory input?',
  'Do you have an unusually high tolerance for pain?',
  'Do you enjoy watching moving objects for extended periods of time?',
  'Are you strongly drawn to certain smells or visual patterns?',
  'Do you seek out certain types of movement like swinging, bouncing, speed or flight?',
  'Do you seek out deep pressure such as tight hugs, heavy blankets, or tight spaces?',
].map((text, i) => ({ id: `dsm5tr_b4_${i + 1}`, text, options: SEVERITY_0_3 }));

const dsm5trCritC: Question[] = [
  {
    id: 'dsm5tr_c1',
    text: 'Have most of your traits (answered 2 or 3) been present since early childhood (age 8 or younger)?',
    options: YES_NO,
  },
  {
    id: 'dsm5tr_c2',
    text: 'Have most of your traits (answered 2 or 3) been present since early adolescence (age 16 or younger)?',
    options: YES_NO,
  },
];

const dsm5trOther: Question[] = [
  'Insomnia or poor sleeping patterns?',
  'Persistent anxiety?',
  'Impaired fine motor coordination (tying shoelaces or holding a pencil)?',
  'Impaired gross motor coordination (PE and games, bumps into things)?',
  'Difficulty in recognising your own emotions?',
  'Difficulty in talking about your own emotions and difficulties?',
  'Difficulty in differentiating between physical sensations and emotions?',
  'Difficulty in recognising the emotions of others?',
  'Dyslexia?',
  'Severe difficulty in making arithmetical calculations?',
  'Problems in recognising familiar people out of context?',
  'Meltdowns or shutdowns: periods of intense emotional upset, physical withdrawal, or fit-like episodes?',
  'Auditory processing issues – problems in processing and understanding spoken language?',
  'Tics – involuntary movements of face or body?',
].map((text, i) => ({ id: `dsm5tr_other_${i + 1}`, text, options: SEVERITY_0_3 }));

export const dsm5trClinicianInstrument: AssessmentInstrument = {
  id: 'dsm5tr_clinician',
  name: 'DSM-5-TR Clinician Interview for ASD Diagnosis',
  shortName: 'DSM-5-TR Interview',
  description: 'A comprehensive clinician-administered interview using DSM-5-TR criteria with severity ratings (0-3) across social communication and restricted/repetitive behaviors.',
  disclaimer: 'This instrument is intended for use by qualified clinicians. It aids in diagnosis but does not replace comprehensive clinical evaluation. Results should be interpreted in the context of a full assessment.',
  categories: [
    { id: 'a1', name: 'A1: Difficulties with Social Initiation and Response', description: 'Rate severity 0-3 for each question.', questions: dsm5trA1 },
    { id: 'a2', name: 'A2: Difficulties with Non-Verbal Communication', description: 'Includes facial expressions, eye contact, gestures, and speech patterns.', questions: dsm5trA2 },
    { id: 'a3', name: 'A3: Difficulties with Relationships', description: 'Social cues, friendships, interaction preferences.', questions: dsm5trA3 },
    { id: 'b1', name: 'B1: Atypical Speech or Movements', description: 'Repetitive speech, motor stereotypes, unusual body positioning.', questions: dsm5trB1 },
    { id: 'b2', name: 'B2: Rituals and Resistance to Change', description: 'Routines, rigid thinking, difficulty with transitions.', questions: dsm5trB2 },
    { id: 'b3', name: 'B3: Intense or Unusual Interests', description: 'Obsessive topics, narrow focus, collecting behaviors.', questions: dsm5trB3 },
    { id: 'b4', name: 'B4: Atypical Sensory Experiences', description: 'Hyper/hypo sensitivity across sensory modalities.', questions: dsm5trB4 },
    { id: 'criterion_c', name: 'C: Early Childhood Presence', description: 'Traits present since early developmental period.', questions: dsm5trCritC },
    { id: 'other_features', name: 'Other Common Features', description: 'Additional features commonly associated with ASD.', questions: dsm5trOther },
  ],
  scoring: {
    a1: {
      type: 'severity_average',
      gradeRanges: [
        { min: 0, max: 0.5, grade: 'None', label: 'No significant difficulties' },
        { min: 0.5, max: 1.5, grade: 'Low', label: 'Low severity' },
        { min: 1.5, max: 2.5, grade: 'Moderate', label: 'Moderate severity' },
        { min: 2.5, max: 3, grade: 'High', label: 'High severity' },
      ],
    },
    a2: {
      type: 'severity_average',
      gradeRanges: [
        { min: 0, max: 0.5, grade: 'None', label: 'No significant difficulties' },
        { min: 0.5, max: 1.5, grade: 'Low', label: 'Low severity' },
        { min: 1.5, max: 2.5, grade: 'Moderate', label: 'Moderate severity' },
        { min: 2.5, max: 3, grade: 'High', label: 'High severity' },
      ],
    },
    a3: {
      type: 'severity_average',
      gradeRanges: [
        { min: 0, max: 0.5, grade: 'None', label: 'No significant difficulties' },
        { min: 0.5, max: 1.5, grade: 'Low', label: 'Low severity' },
        { min: 1.5, max: 2.5, grade: 'Moderate', label: 'Moderate severity' },
        { min: 2.5, max: 3, grade: 'High', label: 'High severity' },
      ],
    },
    b1: {
      type: 'severity_average',
      gradeRanges: [
        { min: 0, max: 0.5, grade: 'None', label: 'No significant difficulties' },
        { min: 0.5, max: 1.5, grade: 'Low', label: 'Low severity' },
        { min: 1.5, max: 2.5, grade: 'Moderate', label: 'Moderate severity' },
        { min: 2.5, max: 3, grade: 'High', label: 'High severity' },
      ],
    },
    b2: {
      type: 'severity_average',
      gradeRanges: [
        { min: 0, max: 0.5, grade: 'None', label: 'No significant difficulties' },
        { min: 0.5, max: 1.5, grade: 'Low', label: 'Low severity' },
        { min: 1.5, max: 2.5, grade: 'Moderate', label: 'Moderate severity' },
        { min: 2.5, max: 3, grade: 'High', label: 'High severity' },
      ],
    },
    b3: {
      type: 'severity_average',
      gradeRanges: [
        { min: 0, max: 0.5, grade: 'None', label: 'No significant difficulties' },
        { min: 0.5, max: 1.5, grade: 'Low', label: 'Low severity' },
        { min: 1.5, max: 2.5, grade: 'Moderate', label: 'Moderate severity' },
        { min: 2.5, max: 3, grade: 'High', label: 'High severity' },
      ],
    },
    b4: {
      type: 'severity_average',
      gradeRanges: [
        { min: 0, max: 0.5, grade: 'None', label: 'No significant difficulties' },
        { min: 0.5, max: 1.5, grade: 'Low', label: 'Low severity' },
        { min: 1.5, max: 2.5, grade: 'Moderate', label: 'Moderate severity' },
        { min: 2.5, max: 3, grade: 'High', label: 'High severity' },
      ],
    },
    criterion_c: { type: 'criteria_met', criteriaThreshold: 1 },
    other_features: { type: 'severity_average' },
  },
  overallScoring: {
    type: 'severity_average',
    gradeRanges: [
      { min: 0, max: 0.5, grade: 'None', label: 'No significant ASD indicators' },
      { min: 0.5, max: 1.5, grade: 'Low', label: 'Low ASD indicators' },
      { min: 1.5, max: 2.5, grade: 'Moderate', label: 'Moderate ASD indicators' },
      { min: 2.5, max: 3, grade: 'High', label: 'High ASD indicators' },
    ],
  },
};

// ========== ALL INSTRUMENTS ==========
export const allInstruments: AssessmentInstrument[] = [
  atecInstrument,
  dsm5InterviewInstrument,
  dsm5trClinicianInstrument,
];

export const getInstrumentById = (id: string): AssessmentInstrument | undefined =>
  allInstruments.find(i => i.id === id);
