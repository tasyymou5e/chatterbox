/**
 * Domain-specific game content for SkillQuest
 * Symbol sets, challenge generators, and color palettes for all 8 skill domains
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

// ── Communication ──
const communicationSymbols: GameSymbol[] = [
  { id: 'hello', emoji: '👋', label: 'Hello', group: 'greeting' },
  { id: 'bye', emoji: '🤚', label: 'Goodbye', group: 'greeting' },
  { id: 'please', emoji: '🙏', label: 'Please', group: 'polite' },
  { id: 'thanks', emoji: '😊', label: 'Thank You', group: 'polite' },
  { id: 'help', emoji: '🆘', label: 'Help', group: 'request' },
  { id: 'want', emoji: '👉', label: 'I Want', group: 'request' },
  { id: 'yes', emoji: '✅', label: 'Yes', group: 'response' },
  { id: 'no', emoji: '❌', label: 'No', group: 'response' },
  { id: 'happy', emoji: '😄', label: 'Happy', group: 'feeling' },
  { id: 'sad', emoji: '😢', label: 'Sad', group: 'feeling' },
];

// ── Social Skills ──
const socialSymbols: GameSymbol[] = [
  { id: 'happy', emoji: '😊', label: 'Happy', group: 'positive' },
  { id: 'sad', emoji: '😢', label: 'Sad', group: 'negative' },
  { id: 'angry', emoji: '😠', label: 'Angry', group: 'negative' },
  { id: 'scared', emoji: '😨', label: 'Scared', group: 'negative' },
  { id: 'surprised', emoji: '😲', label: 'Surprised', group: 'neutral' },
  { id: 'love', emoji: '🥰', label: 'Loving', group: 'positive' },
  { id: 'tired', emoji: '😴', label: 'Tired', group: 'neutral' },
  { id: 'excited', emoji: '🤩', label: 'Excited', group: 'positive' },
  { id: 'confused', emoji: '😕', label: 'Confused', group: 'neutral' },
  { id: 'proud', emoji: '😤', label: 'Proud', group: 'positive' },
];

// ── Sensory Regulation ──
const sensorySymbols: GameSymbol[] = [
  { id: 'loud', emoji: '🔊', label: 'Loud', group: 'sound' },
  { id: 'quiet', emoji: '🔇', label: 'Quiet', group: 'sound' },
  { id: 'bright', emoji: '☀️', label: 'Bright', group: 'light' },
  { id: 'dark', emoji: '🌙', label: 'Dark', group: 'light' },
  { id: 'soft', emoji: '🧸', label: 'Soft', group: 'touch' },
  { id: 'rough', emoji: '🪨', label: 'Rough', group: 'touch' },
  { id: 'hot', emoji: '🔥', label: 'Hot', group: 'temperature' },
  { id: 'cold', emoji: '🧊', label: 'Cold', group: 'temperature' },
  { id: 'sweet', emoji: '🍬', label: 'Sweet', group: 'taste' },
  { id: 'sour', emoji: '🍋', label: 'Sour', group: 'taste' },
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
];

// ── Daily Living ──
const dailyLivingSymbols: GameSymbol[] = [
  { id: 'toothbrush', emoji: '🪥', label: 'Toothbrush', group: 'bathroom' },
  { id: 'soap', emoji: '🧼', label: 'Soap', group: 'bathroom' },
  { id: 'fork', emoji: '🍴', label: 'Fork', group: 'kitchen' },
  { id: 'plate', emoji: '🍽️', label: 'Plate', group: 'kitchen' },
  { id: 'shirt', emoji: '👕', label: 'Shirt', group: 'clothing' },
  { id: 'pants', emoji: '👖', label: 'Pants', group: 'clothing' },
  { id: 'broom', emoji: '🧹', label: 'Broom', group: 'cleaning' },
  { id: 'sponge', emoji: '🧽', label: 'Sponge', group: 'cleaning' },
  { id: 'bed', emoji: '🛏️', label: 'Bed', group: 'bedroom' },
  { id: 'pillow', emoji: '🛌', label: 'Pillow', group: 'bedroom' },
];

// ── Emotional Regulation ──
const emotionalSymbols: GameSymbol[] = [
  { id: 'calm1', emoji: '😌', label: 'Calm', group: 'low' },
  { id: 'content', emoji: '🙂', label: 'Content', group: 'low' },
  { id: 'happy', emoji: '😊', label: 'Happy', group: 'medium' },
  { id: 'excited', emoji: '🤩', label: 'Excited', group: 'medium' },
  { id: 'nervous', emoji: '😰', label: 'Nervous', group: 'medium' },
  { id: 'angry', emoji: '😡', label: 'Very Angry', group: 'high' },
  { id: 'cry', emoji: '😭', label: 'Very Sad', group: 'high' },
  { id: 'breathe', emoji: '🌬️', label: 'Deep Breath', group: 'strategy' },
  { id: 'count', emoji: '🔢', label: 'Count to 10', group: 'strategy' },
  { id: 'squeeze', emoji: '🤗', label: 'Hug/Squeeze', group: 'strategy' },
];

// ── Motor Skills ──
const motorSymbols: GameSymbol[] = [
  { id: 'clap', emoji: '👏', label: 'Clap', group: 'hands' },
  { id: 'wave', emoji: '👋', label: 'Wave', group: 'hands' },
  { id: 'point', emoji: '👆', label: 'Point Up', group: 'hands' },
  { id: 'thumbs', emoji: '👍', label: 'Thumbs Up', group: 'hands' },
  { id: 'jump', emoji: '🦘', label: 'Jump', group: 'body' },
  { id: 'walk', emoji: '🚶', label: 'Walk', group: 'body' },
  { id: 'stretch', emoji: '🧘', label: 'Stretch', group: 'body' },
  { id: 'spin', emoji: '💫', label: 'Spin', group: 'body' },
  { id: 'kick', emoji: '⚽', label: 'Kick', group: 'legs' },
  { id: 'tiptoe', emoji: '🩰', label: 'Tiptoe', group: 'legs' },
];

// ── Academic ──
const academicSymbols: GameSymbol[] = [
  { id: 'a', emoji: '🅰️', label: 'Letter A', group: 'letter' },
  { id: 'b', emoji: '🅱️', label: 'Letter B', group: 'letter' },
  { id: 'one', emoji: '1️⃣', label: 'Number 1', group: 'number' },
  { id: 'two', emoji: '2️⃣', label: 'Number 2', group: 'number' },
  { id: 'three', emoji: '3️⃣', label: 'Number 3', group: 'number' },
  { id: 'circle', emoji: '🔵', label: 'Circle', group: 'shape' },
  { id: 'square', emoji: '🟥', label: 'Square', group: 'shape' },
  { id: 'triangle', emoji: '🔺', label: 'Triangle', group: 'shape' },
  { id: 'star', emoji: '⭐', label: 'Star', group: 'shape' },
  { id: 'plus', emoji: '➕', label: 'Plus', group: 'math' },
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
 * Player must find the one that doesn't belong.
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
 * Player picks the correct missing item from choices.
 */
function generateFillBlankChallenge(symbols: GameSymbol[], length: number): GameChallenge {
  const ordered = symbols.slice(0, Math.min(length + 1, symbols.length));
  if (ordered.length < 3) return generateMatchChallenge(symbols, 3);

  const blankIdx = 1 + Math.floor(Math.random() * (ordered.length - 2)); // never first or last
  const missing = ordered[blankIdx];
  const displayed = ordered.filter((_, i) => i !== blankIdx);

  // Build choices: the correct one + 2 distractors from outside this set
  const distractors = shuffleArray(
    symbols.filter(s => !ordered.some(o => o.id === s.id))
  ).slice(0, 2);
  const choices = shuffleArray([missing, ...distractors]);

  return {
    type: 'fill_blank',
    prompt: 'Which one is missing from the sequence?',
    items: [...displayed, ...choices], // first `displayed.length` are the sequence, rest are choices
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

// ── Domain configs ──

export const DOMAIN_GAME_CONFIGS: Record<string, DomainGameConfig> = {
  communication: {
    domain: 'communication',
    label: 'Communication Quest',
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    accentClass: 'text-blue-600 dark:text-blue-400',
    description: 'Match words to their meanings!',
    symbols: communicationSymbols,
    generateChallenge: (diff) => {
      const mode = pickWeightedMode({ match: 3, odd_one_out: 2, fill_blank: 1 });
      if (mode === 'odd_one_out') return generateOddOneOutChallenge(communicationSymbols, 4 + diff);
      if (mode === 'fill_blank') return generateFillBlankChallenge(communicationSymbols, 4 + diff);
      return generateMatchChallenge(communicationSymbols, 3 + diff);
    },
  },
  social: {
    domain: 'social',
    label: 'Emotion Explorer',
    bgClass: 'bg-purple-50 dark:bg-purple-950/30',
    accentClass: 'text-purple-600 dark:text-purple-400',
    description: 'Sort emotions into groups!',
    symbols: socialSymbols,
    generateChallenge: (diff) => {
      const mode = pickWeightedMode({ sort: 3, odd_one_out: 2 });
      if (mode === 'odd_one_out') return generateOddOneOutChallenge(socialSymbols, 4 + diff);
      return generateSortChallenge(socialSymbols, 2 + Math.min(diff, 1));
    },
  },
  sensory: {
    domain: 'sensory',
    label: 'Sensory Sorter',
    bgClass: 'bg-yellow-50 dark:bg-yellow-950/30',
    accentClass: 'text-yellow-600 dark:text-yellow-400',
    description: 'Sort senses into categories!',
    symbols: sensorySymbols,
    generateChallenge: (diff) => {
      const mode = pickWeightedMode({ sort: 3, odd_one_out: 2 });
      if (mode === 'odd_one_out') return generateOddOneOutChallenge(sensorySymbols, 4 + diff);
      return generateSortChallenge(sensorySymbols, 2 + Math.min(diff, 2));
    },
  },
  executive_function: {
    domain: 'executive_function',
    label: 'Sequence Builder',
    bgClass: 'bg-indigo-50 dark:bg-indigo-950/30',
    accentClass: 'text-indigo-600 dark:text-indigo-400',
    description: 'Put the steps in the right order!',
    symbols: execFunctionSymbols,
    generateChallenge: (diff) => {
      const mode = pickWeightedMode({ sequence: 3, fill_blank: 2 });
      if (mode === 'fill_blank') {
        return generateFillBlankChallenge(
          execFunctionSymbols.filter(s => s.group === 'morning'),
          4 + diff
        );
      }
      return generateSequenceChallenge(
        execFunctionSymbols.filter(s => s.group === 'morning'),
        3 + diff
      );
    },
  },
  daily_living: {
    domain: 'daily_living',
    label: 'Home Helper',
    bgClass: 'bg-green-50 dark:bg-green-950/30',
    accentClass: 'text-green-600 dark:text-green-400',
    description: 'Sort items into rooms!',
    symbols: dailyLivingSymbols,
    generateChallenge: (diff) => {
      const mode = pickWeightedMode({ sort: 3, odd_one_out: 2 });
      if (mode === 'odd_one_out') return generateOddOneOutChallenge(dailyLivingSymbols, 4 + diff);
      return generateSortChallenge(dailyLivingSymbols, 2 + Math.min(diff, 2));
    },
  },
  emotional_regulation: {
    domain: 'emotional_regulation',
    label: 'Feelings Meter',
    bgClass: 'bg-pink-50 dark:bg-pink-950/30',
    accentClass: 'text-pink-600 dark:text-pink-400',
    description: 'Match feelings to their intensity!',
    symbols: emotionalSymbols,
    generateChallenge: (diff) => {
      const mode = pickWeightedMode({ sort: 2, odd_one_out: 2, fill_blank: 1 });
      if (mode === 'odd_one_out') return generateOddOneOutChallenge(emotionalSymbols, 4 + diff);
      if (mode === 'fill_blank') return generateFillBlankChallenge(emotionalSymbols, 4 + diff);
      return generateSortChallenge(emotionalSymbols, 2 + Math.min(diff, 2));
    },
  },
  motor_skills: {
    domain: 'motor_skills',
    label: 'Move & Match',
    bgClass: 'bg-orange-50 dark:bg-orange-950/30',
    accentClass: 'text-orange-600 dark:text-orange-400',
    description: 'Match actions to body parts!',
    symbols: motorSymbols,
    generateChallenge: (diff) => {
      const mode = pickWeightedMode({ match: 3, odd_one_out: 2 });
      if (mode === 'odd_one_out') return generateOddOneOutChallenge(motorSymbols, 4 + diff);
      return generateMatchChallenge(motorSymbols, 3 + diff);
    },
  },
  academic: {
    domain: 'academic',
    label: 'Brain Builders',
    bgClass: 'bg-teal-50 dark:bg-teal-950/30',
    accentClass: 'text-teal-600 dark:text-teal-400',
    description: 'Sort letters, numbers, and shapes!',
    symbols: academicSymbols,
    generateChallenge: (diff) => {
      const mode = pickWeightedMode({ sort: 2, odd_one_out: 2, fill_blank: 1 });
      if (mode === 'odd_one_out') return generateOddOneOutChallenge(academicSymbols, 4 + diff);
      if (mode === 'fill_blank') return generateFillBlankChallenge(academicSymbols, 4 + diff);
      return generateSortChallenge(academicSymbols, 2 + Math.min(diff, 2));
    },
  },
};

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
