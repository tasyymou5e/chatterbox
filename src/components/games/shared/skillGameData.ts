/**
 * Domain-specific game content for SkillQuest
 * Expanded symbol sets, challenge generators, and multiple game variants per domain
 * Inspired by: WonderTree, AutisticHub, Do2Learn, Lighthouse Autism Center resources
 */

import { shuffleArray } from './gameUtils';

export interface GameSymbol {
  id: string;
  emoji: string;
  label: string;
  group?: string; // for sorting/categorization challenges
}

export interface GameChallenge {
  type: 'match' | 'sort' | 'sequence' | 'odd_one_out' | 'fill_blank';
  prompt: string;
  items: GameSymbol[];
  correctAnswer: string[]; // ordered IDs for sequence, group names for sort, correct ID for odd_one_out/fill_blank
  pairs?: { symbolId: string; targetId: string }[];
  /** For fill_blank: the visible partial sequence with one blank */
  blankIndex?: number;
}

export interface DomainGameConfig {
  domain: string;
  label: string;
  bgClass: string;
  accentClass: string;
  description: string;
  symbols: GameSymbol[];
  generateChallenge: (difficulty: number) => GameChallenge;
}

/** A named game variant within a domain */
export interface GameVariant {
  id: string;
  domain: string;
  label: string;
  description: string;
  emoji: string;
  bgClass: string;
  accentClass: string;
  /** Which challenge types this variant emphasizes */
  challengeWeights: Partial<Record<ChallengeType, number>>;
  /** Optional subset of symbols to use */
  symbolFilter?: (s: GameSymbol) => boolean;
  /** Custom prompt override */
  promptOverride?: string;
}

// ── Communication ──
const communicationSymbols: GameSymbol[] = [
  { id: 'hello', emoji: '👋', label: 'Hello', group: 'greeting' },
  { id: 'bye', emoji: '🤚', label: 'Goodbye', group: 'greeting' },
  { id: 'good_morning', emoji: '🌅', label: 'Good Morning', group: 'greeting' },
  { id: 'good_night', emoji: '🌙', label: 'Good Night', group: 'greeting' },
  { id: 'please', emoji: '🙏', label: 'Please', group: 'polite' },
  { id: 'thanks', emoji: '😊', label: 'Thank You', group: 'polite' },
  { id: 'sorry', emoji: '😔', label: 'Sorry', group: 'polite' },
  { id: 'excuse_me', emoji: '🙋', label: 'Excuse Me', group: 'polite' },
  { id: 'help', emoji: '🆘', label: 'Help', group: 'request' },
  { id: 'want', emoji: '👉', label: 'I Want', group: 'request' },
  { id: 'need', emoji: '✋', label: 'I Need', group: 'request' },
  { id: 'more', emoji: '➕', label: 'More', group: 'request' },
  { id: 'stop', emoji: '🛑', label: 'Stop', group: 'request' },
  { id: 'yes', emoji: '✅', label: 'Yes', group: 'response' },
  { id: 'no', emoji: '❌', label: 'No', group: 'response' },
  { id: 'maybe', emoji: '🤷', label: 'Maybe', group: 'response' },
  { id: 'happy', emoji: '😄', label: 'Happy', group: 'feeling' },
  { id: 'sad', emoji: '😢', label: 'Sad', group: 'feeling' },
  { id: 'hungry', emoji: '🍽️', label: 'Hungry', group: 'need' },
  { id: 'thirsty', emoji: '💧', label: 'Thirsty', group: 'need' },
];

// ── Social Skills ──
const socialSymbols: GameSymbol[] = [
  { id: 'happy', emoji: '😊', label: 'Happy', group: 'positive' },
  { id: 'joyful', emoji: '😁', label: 'Joyful', group: 'positive' },
  { id: 'grateful', emoji: '🥹', label: 'Grateful', group: 'positive' },
  { id: 'sad', emoji: '😢', label: 'Sad', group: 'negative' },
  { id: 'angry', emoji: '😠', label: 'Angry', group: 'negative' },
  { id: 'frustrated', emoji: '😤', label: 'Frustrated', group: 'negative' },
  { id: 'scared', emoji: '😨', label: 'Scared', group: 'negative' },
  { id: 'worried', emoji: '😟', label: 'Worried', group: 'negative' },
  { id: 'surprised', emoji: '😲', label: 'Surprised', group: 'neutral' },
  { id: 'love', emoji: '🥰', label: 'Loving', group: 'positive' },
  { id: 'tired', emoji: '😴', label: 'Tired', group: 'neutral' },
  { id: 'bored', emoji: '😐', label: 'Bored', group: 'neutral' },
  { id: 'excited', emoji: '🤩', label: 'Excited', group: 'positive' },
  { id: 'confused', emoji: '😕', label: 'Confused', group: 'neutral' },
  { id: 'proud', emoji: '💪', label: 'Proud', group: 'positive' },
  { id: 'shy', emoji: '🫣', label: 'Shy', group: 'neutral' },
  { id: 'sharing', emoji: '🤝', label: 'Sharing', group: 'social_skill' },
  { id: 'waiting', emoji: '⏳', label: 'Waiting Turn', group: 'social_skill' },
  { id: 'listening', emoji: '👂', label: 'Listening', group: 'social_skill' },
  { id: 'eye_contact', emoji: '👀', label: 'Eye Contact', group: 'social_skill' },
];

// ── Sensory Regulation ──
const sensorySymbols: GameSymbol[] = [
  { id: 'loud', emoji: '🔊', label: 'Loud', group: 'sound' },
  { id: 'quiet', emoji: '🔇', label: 'Quiet', group: 'sound' },
  { id: 'music', emoji: '🎵', label: 'Music', group: 'sound' },
  { id: 'whisper', emoji: '🤫', label: 'Whisper', group: 'sound' },
  { id: 'bright', emoji: '☀️', label: 'Bright', group: 'light' },
  { id: 'dark', emoji: '🌙', label: 'Dark', group: 'light' },
  { id: 'colorful', emoji: '🌈', label: 'Colorful', group: 'light' },
  { id: 'soft', emoji: '🧸', label: 'Soft', group: 'touch' },
  { id: 'rough', emoji: '🪨', label: 'Rough', group: 'touch' },
  { id: 'squishy', emoji: '🫧', label: 'Squishy', group: 'touch' },
  { id: 'smooth', emoji: '🪞', label: 'Smooth', group: 'touch' },
  { id: 'hot', emoji: '🔥', label: 'Hot', group: 'temperature' },
  { id: 'cold', emoji: '🧊', label: 'Cold', group: 'temperature' },
  { id: 'warm', emoji: '🌤️', label: 'Warm', group: 'temperature' },
  { id: 'sweet', emoji: '🍬', label: 'Sweet', group: 'taste' },
  { id: 'sour', emoji: '🍋', label: 'Sour', group: 'taste' },
  { id: 'salty', emoji: '🧂', label: 'Salty', group: 'taste' },
  { id: 'spicy', emoji: '🌶️', label: 'Spicy', group: 'taste' },
  { id: 'flowery', emoji: '🌸', label: 'Flowery', group: 'smell' },
  { id: 'fresh', emoji: '🌿', label: 'Fresh', group: 'smell' },
];

// ── Executive Function ──
const execFunctionSymbols: GameSymbol[] = [
  { id: 'wake', emoji: '⏰', label: '1. Wake Up', group: 'morning' },
  { id: 'brush', emoji: '🪥', label: '2. Brush Teeth', group: 'morning' },
  { id: 'dress', emoji: '👕', label: '3. Get Dressed', group: 'morning' },
  { id: 'eat', emoji: '🥣', label: '4. Eat Breakfast', group: 'morning' },
  { id: 'backpack', emoji: '🎒', label: '5. Pack Bag', group: 'morning' },
  { id: 'shoes', emoji: '👟', label: '6. Put on Shoes', group: 'morning' },
  { id: 'homework', emoji: '📝', label: '1. Start Homework', group: 'task' },
  { id: 'read', emoji: '📖', label: '2. Read Instructions', group: 'task' },
  { id: 'work', emoji: '✏️', label: '3. Do the Work', group: 'task' },
  { id: 'check', emoji: '✅', label: '4. Check Answers', group: 'task' },
  { id: 'snack_get', emoji: '🍎', label: '1. Choose Snack', group: 'snack' },
  { id: 'snack_wash', emoji: '🚿', label: '2. Wash Hands', group: 'snack' },
  { id: 'snack_plate', emoji: '🍽️', label: '3. Get Plate', group: 'snack' },
  { id: 'snack_eat', emoji: '😋', label: '4. Eat Snack', group: 'snack' },
  { id: 'snack_clean', emoji: '🧹', label: '5. Clean Up', group: 'snack' },
  { id: 'bed_pj', emoji: '👚', label: '1. Put on PJs', group: 'bedtime' },
  { id: 'bed_brush', emoji: '🪥', label: '2. Brush Teeth', group: 'bedtime' },
  { id: 'bed_story', emoji: '📚', label: '3. Read Story', group: 'bedtime' },
  { id: 'bed_hug', emoji: '🤗', label: '4. Goodnight Hug', group: 'bedtime' },
  { id: 'bed_sleep', emoji: '😴', label: '5. Sleep', group: 'bedtime' },
];

// ── Daily Living ──
const dailyLivingSymbols: GameSymbol[] = [
  { id: 'toothbrush', emoji: '🪥', label: 'Toothbrush', group: 'bathroom' },
  { id: 'soap', emoji: '🧼', label: 'Soap', group: 'bathroom' },
  { id: 'towel', emoji: '🛁', label: 'Towel', group: 'bathroom' },
  { id: 'shampoo', emoji: '🧴', label: 'Shampoo', group: 'bathroom' },
  { id: 'fork', emoji: '🍴', label: 'Fork', group: 'kitchen' },
  { id: 'plate', emoji: '🍽️', label: 'Plate', group: 'kitchen' },
  { id: 'cup', emoji: '🥤', label: 'Cup', group: 'kitchen' },
  { id: 'spoon', emoji: '🥄', label: 'Spoon', group: 'kitchen' },
  { id: 'shirt', emoji: '👕', label: 'Shirt', group: 'clothing' },
  { id: 'pants', emoji: '👖', label: 'Pants', group: 'clothing' },
  { id: 'socks', emoji: '🧦', label: 'Socks', group: 'clothing' },
  { id: 'jacket', emoji: '🧥', label: 'Jacket', group: 'clothing' },
  { id: 'broom', emoji: '🧹', label: 'Broom', group: 'cleaning' },
  { id: 'sponge', emoji: '🧽', label: 'Sponge', group: 'cleaning' },
  { id: 'trash', emoji: '🗑️', label: 'Trash Can', group: 'cleaning' },
  { id: 'bed', emoji: '🛏️', label: 'Bed', group: 'bedroom' },
  { id: 'pillow', emoji: '🛌', label: 'Pillow', group: 'bedroom' },
  { id: 'lamp', emoji: '💡', label: 'Lamp', group: 'bedroom' },
  { id: 'clock', emoji: '🕐', label: 'Clock', group: 'bedroom' },
  { id: 'book', emoji: '📖', label: 'Book', group: 'bedroom' },
];

// ── Emotional Regulation ──
const emotionalSymbols: GameSymbol[] = [
  { id: 'calm1', emoji: '😌', label: 'Calm', group: 'low' },
  { id: 'content', emoji: '🙂', label: 'Content', group: 'low' },
  { id: 'relaxed', emoji: '😊', label: 'Relaxed', group: 'low' },
  { id: 'peaceful', emoji: '☮️', label: 'Peaceful', group: 'low' },
  { id: 'happy', emoji: '😃', label: 'Happy', group: 'medium' },
  { id: 'excited', emoji: '🤩', label: 'Excited', group: 'medium' },
  { id: 'nervous', emoji: '😰', label: 'Nervous', group: 'medium' },
  { id: 'silly', emoji: '🤪', label: 'Silly', group: 'medium' },
  { id: 'angry', emoji: '😡', label: 'Very Angry', group: 'high' },
  { id: 'cry', emoji: '😭', label: 'Very Sad', group: 'high' },
  { id: 'panic', emoji: '😱', label: 'Panicked', group: 'high' },
  { id: 'overwhelmed', emoji: '🤯', label: 'Overwhelmed', group: 'high' },
  { id: 'breathe', emoji: '🌬️', label: 'Deep Breath', group: 'strategy' },
  { id: 'count', emoji: '🔢', label: 'Count to 10', group: 'strategy' },
  { id: 'squeeze', emoji: '🤗', label: 'Hug/Squeeze', group: 'strategy' },
  { id: 'walk_away', emoji: '🚶', label: 'Walk Away', group: 'strategy' },
  { id: 'music_calm', emoji: '🎧', label: 'Listen to Music', group: 'strategy' },
  { id: 'draw', emoji: '🎨', label: 'Draw/Color', group: 'strategy' },
  { id: 'talk', emoji: '💬', label: 'Talk to Someone', group: 'strategy' },
  { id: 'safe_space', emoji: '🏠', label: 'Go to Safe Space', group: 'strategy' },
];

// ── Motor Skills ──
const motorSymbols: GameSymbol[] = [
  { id: 'clap', emoji: '👏', label: 'Clap', group: 'hands' },
  { id: 'wave', emoji: '👋', label: 'Wave', group: 'hands' },
  { id: 'point', emoji: '👆', label: 'Point Up', group: 'hands' },
  { id: 'thumbs', emoji: '👍', label: 'Thumbs Up', group: 'hands' },
  { id: 'pinch', emoji: '🤏', label: 'Pinch', group: 'hands' },
  { id: 'fist', emoji: '✊', label: 'Make a Fist', group: 'hands' },
  { id: 'snap', emoji: '🫰', label: 'Snap Fingers', group: 'hands' },
  { id: 'jump', emoji: '🦘', label: 'Jump', group: 'body' },
  { id: 'walk', emoji: '🚶', label: 'Walk', group: 'body' },
  { id: 'stretch', emoji: '🧘', label: 'Stretch', group: 'body' },
  { id: 'spin', emoji: '💫', label: 'Spin', group: 'body' },
  { id: 'bend', emoji: '🙇', label: 'Bend Down', group: 'body' },
  { id: 'balance', emoji: '🤸', label: 'Balance', group: 'body' },
  { id: 'kick', emoji: '⚽', label: 'Kick', group: 'legs' },
  { id: 'tiptoe', emoji: '🩰', label: 'Tiptoe', group: 'legs' },
  { id: 'hop', emoji: '🐰', label: 'Hop', group: 'legs' },
  { id: 'march', emoji: '🎖️', label: 'March', group: 'legs' },
  { id: 'catch', emoji: '🥎', label: 'Catch Ball', group: 'coordination' },
  { id: 'throw', emoji: '🎯', label: 'Throw', group: 'coordination' },
  { id: 'stack', emoji: '🧱', label: 'Stack Blocks', group: 'coordination' },
];

// ── Academic ──
const academicSymbols: GameSymbol[] = [
  { id: 'a', emoji: '🅰️', label: 'Letter A', group: 'letter' },
  { id: 'b', emoji: '🅱️', label: 'Letter B', group: 'letter' },
  { id: 'c', emoji: '©️', label: 'Letter C', group: 'letter' },
  { id: 'abc', emoji: '🔤', label: 'ABC', group: 'letter' },
  { id: 'one', emoji: '1️⃣', label: 'Number 1', group: 'number' },
  { id: 'two', emoji: '2️⃣', label: 'Number 2', group: 'number' },
  { id: 'three', emoji: '3️⃣', label: 'Number 3', group: 'number' },
  { id: 'four', emoji: '4️⃣', label: 'Number 4', group: 'number' },
  { id: 'five', emoji: '5️⃣', label: 'Number 5', group: 'number' },
  { id: 'circle', emoji: '🔵', label: 'Circle', group: 'shape' },
  { id: 'square', emoji: '🟥', label: 'Square', group: 'shape' },
  { id: 'triangle', emoji: '🔺', label: 'Triangle', group: 'shape' },
  { id: 'star', emoji: '⭐', label: 'Star', group: 'shape' },
  { id: 'diamond', emoji: '💎', label: 'Diamond', group: 'shape' },
  { id: 'heart', emoji: '❤️', label: 'Heart', group: 'shape' },
  { id: 'plus', emoji: '➕', label: 'Plus', group: 'math' },
  { id: 'minus', emoji: '➖', label: 'Minus', group: 'math' },
  { id: 'equals', emoji: '🟰', label: 'Equals', group: 'math' },
  { id: 'red', emoji: '🔴', label: 'Red', group: 'color' },
  { id: 'blue', emoji: '🔵', label: 'Blue', group: 'color' },
  { id: 'green', emoji: '🟢', label: 'Green', group: 'color' },
  { id: 'yellow', emoji: '🟡', label: 'Yellow', group: 'color' },
];

// ── Challenge generators ──

function generateMatchChallenge(symbols: GameSymbol[], count: number): GameChallenge {
  const selected = shuffleArray(symbols).slice(0, count);
  const shuffledTargets = shuffleArray([...selected]);
  return {
    type: 'match',
    prompt: 'Match each symbol to its name!',
    items: selected,
    correctAnswer: selected.map(s => s.id),
    pairs: selected.map((s, i) => ({
      symbolId: s.id,
      targetId: shuffledTargets[i].id,
    })),
  };
}

function generateSortChallenge(symbols: GameSymbol[], groupCount: number): GameChallenge {
  const groups = [...new Set(symbols.map(s => s.group).filter(Boolean))].slice(0, groupCount);
  const filtered = symbols.filter(s => groups.includes(s.group));
  return {
    type: 'sort',
    prompt: 'Drag items into the right groups!',
    items: shuffleArray(filtered),
    correctAnswer: groups as string[],
  };
}

function generateSequenceChallenge(symbols: GameSymbol[], length: number): GameChallenge {
  const ordered = symbols.slice(0, length);
  return {
    type: 'sequence',
    prompt: 'Put these in the right order!',
    items: shuffleArray(ordered),
    correctAnswer: ordered.map(s => s.id),
  };
}

/**
 * Odd-one-out: show N items from the same group + 1 from a different group.
 */
function generateOddOneOutChallenge(symbols: GameSymbol[], size: number): GameChallenge {
  const groups = [...new Set(symbols.map(s => s.group).filter(Boolean))];
  if (groups.length < 2) return generateMatchChallenge(symbols, size);

  const mainGroup = groups[Math.floor(Math.random() * groups.length)];
  const otherGroups = groups.filter(g => g !== mainGroup);
  const oddGroup = otherGroups[Math.floor(Math.random() * otherGroups.length)];

  const mainItems = shuffleArray(symbols.filter(s => s.group === mainGroup)).slice(0, size - 1);
  const oddItem = shuffleArray(symbols.filter(s => s.group === oddGroup))[0];

  if (!oddItem || mainItems.length < size - 1) {
    return generateMatchChallenge(symbols, size);
  }

  const items = shuffleArray([...mainItems, oddItem]);
  return {
    type: 'odd_one_out',
    prompt: `Find the one that doesn't belong!`,
    items,
    correctAnswer: [oddItem.id],
  };
}

/**
 * Fill-in-the-blank: show an ordered sequence with one item missing.
 */
function generateFillBlankChallenge(symbols: GameSymbol[], length: number): GameChallenge {
  const ordered = symbols.slice(0, Math.min(length + 1, symbols.length));
  if (ordered.length < 3) return generateMatchChallenge(symbols, 3);

  const blankIdx = 1 + Math.floor(Math.random() * (ordered.length - 2));
  const missing = ordered[blankIdx];
  const displayed = ordered.filter((_, i) => i !== blankIdx);

  const distractors = shuffleArray(
    symbols.filter(s => !ordered.some(o => o.id === s.id))
  ).slice(0, 2);
  const choices = shuffleArray([missing, ...distractors]);

  return {
    type: 'fill_blank',
    prompt: 'Which one is missing from the sequence?',
    items: [...displayed, ...choices],
    correctAnswer: [missing.id],
    blankIndex: blankIdx,
  };
}

// ── Weighted random challenge picker ──
type ChallengeType = 'match' | 'sort' | 'sequence' | 'odd_one_out' | 'fill_blank';

function pickWeightedMode(
  weights: Partial<Record<ChallengeType, number>>
): ChallengeType {
  const entries = Object.entries(weights) as [ChallengeType, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [mode, weight] of entries) {
    r -= weight;
    if (r <= 0) return mode;
  }
  return entries[0][0];
}

/** Build a challenge generator from weights + optional symbol filter */
function makeGenerator(
  allSymbols: GameSymbol[],
  weights: Partial<Record<ChallengeType, number>>,
  symbolFilter?: (s: GameSymbol) => boolean,
  promptOverride?: string,
) {
  return (diff: number): GameChallenge => {
    const symbols = symbolFilter ? allSymbols.filter(symbolFilter) : allSymbols;
    const mode = pickWeightedMode(weights);
    let challenge: GameChallenge;

    switch (mode) {
      case 'odd_one_out':
        challenge = generateOddOneOutChallenge(symbols, 4 + diff);
        break;
      case 'fill_blank':
        challenge = generateFillBlankChallenge(symbols, 4 + diff);
        break;
      case 'sequence':
        challenge = generateSequenceChallenge(symbols, 3 + diff);
        break;
      case 'sort':
        challenge = generateSortChallenge(symbols, 2 + Math.min(diff, 2));
        break;
      case 'match':
      default:
        challenge = generateMatchChallenge(symbols, 3 + diff);
        break;
    }

    if (promptOverride) challenge.prompt = promptOverride;
    return challenge;
  };
}

// ── Domain configs (backward compatible) ──

export const DOMAIN_GAME_CONFIGS: Record<string, DomainGameConfig> = {
  communication: {
    domain: 'communication',
    label: 'Communication Quest',
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    accentClass: 'text-blue-600 dark:text-blue-400',
    description: 'Match words to their meanings!',
    symbols: communicationSymbols,
    generateChallenge: makeGenerator(communicationSymbols, { match: 3, odd_one_out: 2, fill_blank: 1 }),
  },
  social: {
    domain: 'social',
    label: 'Emotion Explorer',
    bgClass: 'bg-purple-50 dark:bg-purple-950/30',
    accentClass: 'text-purple-600 dark:text-purple-400',
    description: 'Sort emotions into groups!',
    symbols: socialSymbols,
    generateChallenge: makeGenerator(socialSymbols, { sort: 3, odd_one_out: 2 }),
  },
  sensory: {
    domain: 'sensory',
    label: 'Sensory Sorter',
    bgClass: 'bg-yellow-50 dark:bg-yellow-950/30',
    accentClass: 'text-yellow-600 dark:text-yellow-400',
    description: 'Sort senses into categories!',
    symbols: sensorySymbols,
    generateChallenge: makeGenerator(sensorySymbols, { sort: 3, odd_one_out: 2 }),
  },
  executive_function: {
    domain: 'executive_function',
    label: 'Sequence Builder',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/30',
    accentClass: 'text-indigo-600 dark:text-indigo-400',
    description: 'Put the steps in the right order!',
    symbols: execFunctionSymbols,
    generateChallenge: makeGenerator(
      execFunctionSymbols,
      { sequence: 3, fill_blank: 2 },
      s => s.group === 'morning',
    ),
  },
  daily_living: {
    domain: 'daily_living',
    label: 'Home Helper',
    bgClass: 'bg-green-50 dark:bg-green-950/30',
    accentClass: 'text-green-600 dark:text-green-400',
    description: 'Sort items into rooms!',
    symbols: dailyLivingSymbols,
    generateChallenge: makeGenerator(dailyLivingSymbols, { sort: 3, odd_one_out: 2 }),
  },
  emotional_regulation: {
    domain: 'emotional_regulation',
    label: 'Feelings Meter',
    bgClass: 'bg-pink-50 dark:bg-pink-950/30',
    accentClass: 'text-pink-600 dark:text-pink-400',
    description: 'Match feelings to their intensity!',
    symbols: emotionalSymbols,
    generateChallenge: makeGenerator(emotionalSymbols, { sort: 2, odd_one_out: 2, fill_blank: 1 }),
  },
  motor_skills: {
    domain: 'motor_skills',
    label: 'Move & Match',
    bgClass: 'bg-orange-50 dark:bg-orange-950/30',
    accentClass: 'text-orange-600 dark:text-orange-400',
    description: 'Match actions to body parts!',
    symbols: motorSymbols,
    generateChallenge: makeGenerator(motorSymbols, { match: 3, odd_one_out: 2 }),
  },
  academic: {
    domain: 'academic',
    label: 'Brain Builders',
    bgClass: 'bg-teal-50 dark:bg-teal-950/30',
    accentClass: 'text-teal-600 dark:text-teal-400',
    description: 'Sort letters, numbers, and shapes!',
    symbols: academicSymbols,
    generateChallenge: makeGenerator(academicSymbols, { sort: 2, odd_one_out: 2, fill_blank: 1 }),
  },
};

// ── Game Variants: multiple named mini-games per domain ──

export const GAME_VARIANTS: GameVariant[] = [
  // ── Communication (5 variants) ──
  {
    id: 'comm-word-match',
    domain: 'communication',
    label: 'Word Matcher',
    description: 'Match symbols to their words!',
    emoji: '🔤',
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    accentClass: 'text-blue-600 dark:text-blue-400',
    challengeWeights: { match: 5, odd_one_out: 1 },
  },
  {
    id: 'comm-greeting-sort',
    domain: 'communication',
    label: 'Greeting Sorter',
    description: 'Sort greetings, requests & responses!',
    emoji: '👋',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    accentClass: 'text-blue-700 dark:text-blue-300',
    challengeWeights: { sort: 4, odd_one_out: 2 },
    symbolFilter: s => ['greeting', 'polite', 'response'].includes(s.group || ''),
    promptOverride: 'Sort these into the right group!',
  },
  {
    id: 'comm-needs-finder',
    domain: 'communication',
    label: 'Needs Finder',
    description: 'Find the odd one out from needs & feelings!',
    emoji: '🆘',
    bgClass: 'bg-sky-50 dark:bg-sky-950/30',
    accentClass: 'text-sky-600 dark:text-sky-400',
    challengeWeights: { odd_one_out: 4, fill_blank: 2 },
    symbolFilter: s => ['request', 'need', 'feeling'].includes(s.group || ''),
  },
  {
    id: 'comm-conversation-builder',
    domain: 'communication',
    label: 'Conversation Builder',
    description: 'Put conversation steps in order!',
    emoji: '💬',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/30',
    accentClass: 'text-indigo-600 dark:text-indigo-400',
    challengeWeights: { sequence: 4, fill_blank: 2 },
    symbolFilter: s => ['greeting', 'polite', 'response'].includes(s.group || ''),
    promptOverride: 'What comes next in the conversation?',
  },
  {
    id: 'comm-polite-words',
    domain: 'communication',
    label: 'Polite Words',
    description: 'Match polite words to their meanings!',
    emoji: '🌟',
    bgClass: 'bg-cyan-50 dark:bg-cyan-950/30',
    accentClass: 'text-cyan-600 dark:text-cyan-400',
    challengeWeights: { match: 4, odd_one_out: 2 },
    symbolFilter: s => s.group === 'polite' || s.group === 'greeting',
  },

  // ── Social Skills (5 variants) ──
  {
    id: 'social-emotion-sort',
    domain: 'social',
    label: 'Emotion Explorer',
    description: 'Sort emotions: positive, negative, neutral!',
    emoji: '😊',
    bgClass: 'bg-purple-50 dark:bg-purple-950/30',
    accentClass: 'text-purple-600 dark:text-purple-400',
    challengeWeights: { sort: 4, odd_one_out: 2 },
    symbolFilter: s => ['positive', 'negative', 'neutral'].includes(s.group || ''),
  },
  {
    id: 'social-skill-match',
    domain: 'social',
    label: 'Social Skills Match',
    description: 'Match social skills to their symbols!',
    emoji: '🤝',
    bgClass: 'bg-violet-50 dark:bg-violet-950/30',
    accentClass: 'text-violet-600 dark:text-violet-400',
    challengeWeights: { match: 4, fill_blank: 1 },
    symbolFilter: s => s.group === 'social_skill',
  },
  {
    id: 'social-odd-feeling',
    domain: 'social',
    label: 'Feeling Detective',
    description: 'Find the feeling that doesn\'t belong!',
    emoji: '🔍',
    bgClass: 'bg-fuchsia-50 dark:bg-fuchsia-950/30',
    accentClass: 'text-fuchsia-600 dark:text-fuchsia-400',
    challengeWeights: { odd_one_out: 5, match: 1 },
  },
  {
    id: 'social-friendship-sort',
    domain: 'social',
    label: 'Friendship Builder',
    description: 'Sort friendly vs unfriendly behaviors!',
    emoji: '💛',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    accentClass: 'text-amber-600 dark:text-amber-400',
    challengeWeights: { sort: 5, odd_one_out: 1 },
    symbolFilter: s => ['social_skill', 'positive'].includes(s.group || ''),
    promptOverride: 'Which are friendly behaviors?',
  },
  {
    id: 'social-face-reader',
    domain: 'social',
    label: 'Face Reader',
    description: 'Match faces to the right emotion name!',
    emoji: '🎭',
    bgClass: 'bg-pink-50 dark:bg-pink-950/30',
    accentClass: 'text-pink-600 dark:text-pink-400',
    challengeWeights: { match: 5, fill_blank: 1 },
    symbolFilter: s => ['positive', 'negative', 'neutral'].includes(s.group || ''),
    promptOverride: 'What emotion is this face showing?',
  },

  // ── Sensory (5 variants) ──
  {
    id: 'sensory-five-senses',
    domain: 'sensory',
    label: 'Five Senses Sorter',
    description: 'Sort items by sense: touch, taste, sound!',
    emoji: '🌈',
    bgClass: 'bg-yellow-50 dark:bg-yellow-950/30',
    accentClass: 'text-yellow-600 dark:text-yellow-400',
    challengeWeights: { sort: 5, odd_one_out: 1 },
  },
  {
    id: 'sensory-opposites',
    domain: 'sensory',
    label: 'Opposites Finder',
    description: 'Match sensory opposites: hot/cold, loud/quiet!',
    emoji: '🔄',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    accentClass: 'text-amber-600 dark:text-amber-400',
    challengeWeights: { match: 5, odd_one_out: 1 },
  },
  {
    id: 'sensory-odd-sense',
    domain: 'sensory',
    label: 'Sense Detective',
    description: 'Find what doesn\'t belong in each sense!',
    emoji: '🕵️',
    bgClass: 'bg-lime-50 dark:bg-lime-950/30',
    accentClass: 'text-lime-600 dark:text-lime-400',
    challengeWeights: { odd_one_out: 5, fill_blank: 1 },
  },
  {
    id: 'sensory-texture-match',
    domain: 'sensory',
    label: 'Texture Match',
    description: 'Match textures: soft, rough, smooth, squishy!',
    emoji: '🧸',
    bgClass: 'bg-orange-50 dark:bg-orange-950/30',
    accentClass: 'text-orange-600 dark:text-orange-400',
    challengeWeights: { match: 4, sort: 2 },
    symbolFilter: s => s.group === 'touch',
    promptOverride: 'Match each texture to its name!',
  },
  {
    id: 'sensory-calming-vs-alerting',
    domain: 'sensory',
    label: 'Calm or Alert?',
    description: 'Is this sense calming or alerting?',
    emoji: '⚖️',
    bgClass: 'bg-teal-50 dark:bg-teal-950/30',
    accentClass: 'text-teal-600 dark:text-teal-400',
    challengeWeights: { sort: 4, odd_one_out: 2 },
    promptOverride: 'Sort: calming or alerting?',
  },

  // ── Executive Function (5 variants) ──
  {
    id: 'exec-morning-routine',
    domain: 'executive_function',
    label: 'Morning Routine',
    description: 'Put your morning steps in order!',
    emoji: '⏰',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/30',
    accentClass: 'text-indigo-600 dark:text-indigo-400',
    challengeWeights: { sequence: 5, fill_blank: 2 },
    symbolFilter: s => s.group === 'morning',
  },
  {
    id: 'exec-bedtime-routine',
    domain: 'executive_function',
    label: 'Bedtime Routine',
    description: 'Order the bedtime steps correctly!',
    emoji: '🌙',
    bgClass: 'bg-slate-100 dark:bg-slate-900/30',
    accentClass: 'text-slate-600 dark:text-slate-400',
    challengeWeights: { sequence: 5, fill_blank: 2 },
    symbolFilter: s => s.group === 'bedtime',
  },
  {
    id: 'exec-task-planner',
    domain: 'executive_function',
    label: 'Task Planner',
    description: 'What step comes next? Fill the blank!',
    emoji: '📋',
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    accentClass: 'text-blue-600 dark:text-blue-400',
    challengeWeights: { fill_blank: 4, sequence: 2 },
    symbolFilter: s => ['task', 'snack'].includes(s.group || ''),
  },
  {
    id: 'exec-snack-time',
    domain: 'executive_function',
    label: 'Snack Time Steps',
    description: 'Order the steps to make a snack!',
    emoji: '🍎',
    bgClass: 'bg-green-50 dark:bg-green-950/30',
    accentClass: 'text-green-600 dark:text-green-400',
    challengeWeights: { sequence: 5, fill_blank: 1 },
    symbolFilter: s => s.group === 'snack',
  },
  {
    id: 'exec-routine-mix',
    domain: 'executive_function',
    label: 'Routine Mixer',
    description: 'Sort steps into the right routine!',
    emoji: '🔀',
    bgClass: 'bg-violet-50 dark:bg-violet-950/30',
    accentClass: 'text-violet-600 dark:text-violet-400',
    challengeWeights: { sort: 4, odd_one_out: 2 },
    promptOverride: 'Which routine does this step belong to?',
  },

  // ── Daily Living (5 variants) ──
  {
    id: 'daily-room-sort',
    domain: 'daily_living',
    label: 'Room Sorter',
    description: 'Sort items into the right rooms!',
    emoji: '🏠',
    bgClass: 'bg-green-50 dark:bg-green-950/30',
    accentClass: 'text-green-600 dark:text-green-400',
    challengeWeights: { sort: 5, odd_one_out: 1 },
  },
  {
    id: 'daily-whats-missing',
    domain: 'daily_living',
    label: 'What\'s Missing?',
    description: 'Find the missing item in each room!',
    emoji: '❓',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    accentClass: 'text-emerald-600 dark:text-emerald-400',
    challengeWeights: { fill_blank: 4, odd_one_out: 2 },
  },
  {
    id: 'daily-odd-item',
    domain: 'daily_living',
    label: 'Odd Item Out',
    description: 'Which item doesn\'t belong in this room?',
    emoji: '🧐',
    bgClass: 'bg-teal-50 dark:bg-teal-950/30',
    accentClass: 'text-teal-600 dark:text-teal-400',
    challengeWeights: { odd_one_out: 5, match: 1 },
  },
  {
    id: 'daily-kitchen-helper',
    domain: 'daily_living',
    label: 'Kitchen Helper',
    description: 'Match kitchen items to their names!',
    emoji: '🍳',
    bgClass: 'bg-yellow-50 dark:bg-yellow-950/30',
    accentClass: 'text-yellow-600 dark:text-yellow-400',
    challengeWeights: { match: 5, odd_one_out: 1 },
    symbolFilter: s => s.group === 'kitchen' || s.group === 'cleaning',
    promptOverride: 'Match each kitchen item!',
  },
  {
    id: 'daily-getting-dressed',
    domain: 'daily_living',
    label: 'Getting Dressed',
    description: 'Sort clothing items vs bathroom items!',
    emoji: '👕',
    bgClass: 'bg-sky-50 dark:bg-sky-950/30',
    accentClass: 'text-sky-600 dark:text-sky-400',
    challengeWeights: { sort: 4, odd_one_out: 2 },
    symbolFilter: s => s.group === 'clothing' || s.group === 'bathroom',
    promptOverride: 'Sort: clothing or bathroom?',
  },

  // ── Emotional Regulation (5 variants) ──
  {
    id: 'emo-feelings-meter',
    domain: 'emotional_regulation',
    label: 'Feelings Meter',
    description: 'Sort feelings by intensity: low, medium, high!',
    emoji: '💖',
    bgClass: 'bg-pink-50 dark:bg-pink-950/30',
    accentClass: 'text-pink-600 dark:text-pink-400',
    challengeWeights: { sort: 5, odd_one_out: 1 },
    symbolFilter: s => ['low', 'medium', 'high'].includes(s.group || ''),
  },
  {
    id: 'emo-coping-match',
    domain: 'emotional_regulation',
    label: 'Coping Toolbox',
    description: 'Match calming strategies to their symbols!',
    emoji: '🧘',
    bgClass: 'bg-rose-50 dark:bg-rose-950/30',
    accentClass: 'text-rose-600 dark:text-rose-400',
    challengeWeights: { match: 5, fill_blank: 1 },
    symbolFilter: s => s.group === 'strategy',
    promptOverride: 'Match each coping strategy!',
  },
  {
    id: 'emo-zone-check',
    domain: 'emotional_regulation',
    label: 'Zone Check',
    description: 'Is this feeling calm, medium, or big?',
    emoji: '🚦',
    bgClass: 'bg-red-50 dark:bg-red-950/30',
    accentClass: 'text-red-600 dark:text-red-400',
    challengeWeights: { odd_one_out: 4, sort: 2 },
  },
  {
    id: 'emo-calm-down-steps',
    domain: 'emotional_regulation',
    label: 'Calm Down Steps',
    description: 'Put calming steps in the right order!',
    emoji: '🌊',
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    accentClass: 'text-blue-600 dark:text-blue-400',
    challengeWeights: { sequence: 4, fill_blank: 2 },
    symbolFilter: s => s.group === 'strategy',
    promptOverride: 'Order the calm-down steps!',
  },
  {
    id: 'emo-big-vs-small',
    domain: 'emotional_regulation',
    label: 'Big vs Small Feelings',
    description: 'Sort big feelings from small feelings!',
    emoji: '📊',
    bgClass: 'bg-purple-50 dark:bg-purple-950/30',
    accentClass: 'text-purple-600 dark:text-purple-400',
    challengeWeights: { sort: 5, odd_one_out: 1 },
    symbolFilter: s => ['low', 'high'].includes(s.group || ''),
    promptOverride: 'Is this a big or small feeling?',
  },

  // ── Motor Skills (5 variants) ──
  {
    id: 'motor-body-match',
    domain: 'motor_skills',
    label: 'Body Part Match',
    description: 'Match actions to hands, body, or legs!',
    emoji: '🏃',
    bgClass: 'bg-orange-50 dark:bg-orange-950/30',
    accentClass: 'text-orange-600 dark:text-orange-400',
    challengeWeights: { sort: 4, match: 2 },
  },
  {
    id: 'motor-action-hero',
    domain: 'motor_skills',
    label: 'Action Hero',
    description: 'Match the action to its emoji!',
    emoji: '🦸',
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    accentClass: 'text-amber-600 dark:text-amber-400',
    challengeWeights: { match: 5, odd_one_out: 1 },
  },
  {
    id: 'motor-coordination',
    domain: 'motor_skills',
    label: 'Coordination Challenge',
    description: 'Find the odd action out!',
    emoji: '🎯',
    bgClass: 'bg-yellow-50 dark:bg-yellow-950/30',
    accentClass: 'text-yellow-600 dark:text-yellow-400',
    challengeWeights: { odd_one_out: 4, fill_blank: 2 },
    symbolFilter: s => s.group === 'coordination' || s.group === 'hands',
  },
  {
    id: 'motor-hand-gym',
    domain: 'motor_skills',
    label: 'Hand Gym',
    description: 'Match fine motor actions!',
    emoji: '✋',
    bgClass: 'bg-rose-50 dark:bg-rose-950/30',
    accentClass: 'text-rose-600 dark:text-rose-400',
    challengeWeights: { match: 5, fill_blank: 1 },
    symbolFilter: s => s.group === 'hands',
    promptOverride: 'Match each hand action!',
  },
  {
    id: 'motor-movement-sequence',
    domain: 'motor_skills',
    label: 'Movement Sequence',
    description: 'Put movements in order to make a routine!',
    emoji: '🎪',
    bgClass: 'bg-lime-50 dark:bg-lime-950/30',
    accentClass: 'text-lime-600 dark:text-lime-400',
    challengeWeights: { sequence: 4, fill_blank: 2 },
    symbolFilter: s => s.group === 'body' || s.group === 'legs',
    promptOverride: 'Create a movement sequence!',
  },

  // ── Academic (5 variants) ──
  {
    id: 'acad-shape-sort',
    domain: 'academic',
    label: 'Shape Sorter',
    description: 'Sort shapes, letters & numbers!',
    emoji: '🔺',
    bgClass: 'bg-teal-50 dark:bg-teal-950/30',
    accentClass: 'text-teal-600 dark:text-teal-400',
    challengeWeights: { sort: 5, odd_one_out: 1 },
  },
  {
    id: 'acad-color-match',
    domain: 'academic',
    label: 'Color Match',
    description: 'Match colors to their names!',
    emoji: '🎨',
    bgClass: 'bg-cyan-50 dark:bg-cyan-950/30',
    accentClass: 'text-cyan-600 dark:text-cyan-400',
    challengeWeights: { match: 5, odd_one_out: 1 },
    symbolFilter: s => s.group === 'color' || s.group === 'shape',
  },
  {
    id: 'acad-number-sequence',
    domain: 'academic',
    label: 'Number Sequence',
    description: 'Put numbers in the right order!',
    emoji: '🔢',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    accentClass: 'text-emerald-600 dark:text-emerald-400',
    challengeWeights: { sequence: 4, fill_blank: 3 },
    symbolFilter: s => s.group === 'number',
  },
  {
    id: 'acad-letter-detective',
    domain: 'academic',
    label: 'Letter Detective',
    description: 'Find which letter doesn\'t belong!',
    emoji: '🔎',
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    accentClass: 'text-blue-600 dark:text-blue-400',
    challengeWeights: { odd_one_out: 5, match: 1 },
    symbolFilter: s => s.group === 'letter' || s.group === 'number',
    promptOverride: 'Which one doesn\'t belong?',
  },
  {
    id: 'acad-math-match',
    domain: 'academic',
    label: 'Math Symbols',
    description: 'Match math symbols to their names!',
    emoji: '➕',
    bgClass: 'bg-violet-50 dark:bg-violet-950/30',
    accentClass: 'text-violet-600 dark:text-violet-400',
    challengeWeights: { match: 4, fill_blank: 2 },
    symbolFilter: s => s.group === 'math' || s.group === 'number',
    promptOverride: 'Match each math symbol!',
  },
];

/** Standalone game entries that use different game engines */
export interface StandaloneGameEntry {
  id: string;
  domain: string;
  label: string;
  description: string;
  emoji: string;
  bgClass: string;
  accentClass: string;
  /** Which component to render: 'memory' | 'pattern' | 'sounds' */
  gameType: 'memory' | 'pattern' | 'sounds';
}

export const STANDALONE_GAMES: StandaloneGameEntry[] = [
  // Memory Match variants mapped to domains
  {
    id: 'bonus-memory-emotions',
    domain: 'social',
    label: 'Emotion Memory',
    description: 'Flip cards to match emotion pairs!',
    emoji: '🃏',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    accentClass: 'text-purple-700 dark:text-purple-300',
    gameType: 'memory',
  },
  {
    id: 'bonus-memory-sensory',
    domain: 'sensory',
    label: 'Sensory Memory',
    description: 'Match sensory pairs from memory!',
    emoji: '🧠',
    bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
    accentClass: 'text-yellow-700 dark:text-yellow-300',
    gameType: 'memory',
  },
  {
    id: 'bonus-memory-daily',
    domain: 'daily_living',
    label: 'Home Memory',
    description: 'Flip & match household item pairs!',
    emoji: '🏡',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    accentClass: 'text-green-700 dark:text-green-300',
    gameType: 'memory',
  },
  // Pattern Match variants
  {
    id: 'bonus-pattern-academic',
    domain: 'academic',
    label: 'Pattern Spotter',
    description: 'Find the pattern & pick what comes next!',
    emoji: '🧩',
    bgClass: 'bg-teal-100 dark:bg-teal-900/30',
    accentClass: 'text-teal-700 dark:text-teal-300',
    gameType: 'pattern',
  },
  {
    id: 'bonus-pattern-exec',
    domain: 'executive_function',
    label: 'Sequence Spotter',
    description: 'Spot the pattern in the sequence!',
    emoji: '🔮',
    bgClass: 'bg-indigo-100 dark:bg-indigo-900/30',
    accentClass: 'text-indigo-700 dark:text-indigo-300',
    gameType: 'pattern',
  },
  // Sounds Match variants
  {
    id: 'bonus-sounds-communication',
    domain: 'communication',
    label: 'Sound Match',
    description: 'Listen & match sounds to pictures!',
    emoji: '🔔',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    accentClass: 'text-blue-700 dark:text-blue-300',
    gameType: 'sounds',
  },
  {
    id: 'bonus-sounds-sensory',
    domain: 'sensory',
    label: 'Sound Sorter',
    description: 'Listen to sounds & find the match!',
    emoji: '🎵',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    accentClass: 'text-amber-700 dark:text-amber-300',
    gameType: 'sounds',
  },
  {
    id: 'bonus-sounds-motor',
    domain: 'motor_skills',
    label: 'Action Sounds',
    description: 'Match action sounds to movements!',
    emoji: '🥁',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    accentClass: 'text-orange-700 dark:text-orange-300',
    gameType: 'sounds',
  },
];

/** Get all games (variants + standalone) grouped by domain */
export function getAllGamesByDomain(): Record<string, { variants: GameVariant[]; standalone: StandaloneGameEntry[] }> {
  const grouped: Record<string, { variants: GameVariant[]; standalone: StandaloneGameEntry[] }> = {};
  for (const domain of Object.keys(DOMAIN_GAME_CONFIGS)) {
    grouped[domain] = { variants: [], standalone: [] };
  }
  for (const v of GAME_VARIANTS) {
    if (!grouped[v.domain]) grouped[v.domain] = { variants: [], standalone: [] };
    grouped[v.domain].variants.push(v);
  }
  for (const s of STANDALONE_GAMES) {
    if (!grouped[s.domain]) grouped[s.domain] = { variants: [], standalone: [] };
    grouped[s.domain].standalone.push(s);
  }
  return grouped;
}

/** Get all symbol data for a domain */
function getSymbolsForDomain(domain: string): GameSymbol[] {
  return DOMAIN_GAME_CONFIGS[domain]?.symbols || communicationSymbols;
}

/** Create a DomainGameConfig from a GameVariant */
export function variantToConfig(variant: GameVariant): DomainGameConfig {
  const baseSymbols = getSymbolsForDomain(variant.domain);
  return {
    domain: variant.domain,
    label: variant.label,
    bgClass: variant.bgClass,
    accentClass: variant.accentClass,
    description: variant.description,
    symbols: variant.symbolFilter ? baseSymbols.filter(variant.symbolFilter) : baseSymbols,
    generateChallenge: makeGenerator(
      baseSymbols,
      variant.challengeWeights,
      variant.symbolFilter,
      variant.promptOverride,
    ),
  };
}

/** Get variants grouped by domain */
export function getVariantsByDomain(): Record<string, GameVariant[]> {
  const grouped: Record<string, GameVariant[]> = {};
  for (const v of GAME_VARIANTS) {
    if (!grouped[v.domain]) grouped[v.domain] = [];
    grouped[v.domain].push(v);
  }
  return grouped;
}

export function getDomainGameConfig(domain: string): DomainGameConfig {
  return DOMAIN_GAME_CONFIGS[domain] || DOMAIN_GAME_CONFIGS.communication;
}

/** Number of rounds per difficulty */
export function getRoundCount(difficulty: string): number {
  switch (difficulty) {
    case 'easy': return 3;
    case 'medium': return 5;
    case 'hard': return 7;
    default: return 4;
  }
}
