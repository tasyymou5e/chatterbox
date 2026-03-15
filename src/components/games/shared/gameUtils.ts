/**
 * Shared utilities for game components
 */

import type { SkillLevel } from '@/types/kidsPortal';
import { cDebug } from '@/utils/wideLogger';

// Game difficulty configurations
export const DIFFICULTY_CONFIG = {
  beginner: {
    gridSize: { cols: 3, rows: 4 }, // 12 cards = 6 pairs
    timeLimit: null, // No time pressure
    hintDelay: 8000, // Show hint after 8 seconds
    patternLength: 3,
    soundCount: 4,
  },
  intermediate: {
    gridSize: { cols: 4, rows: 4 }, // 16 cards = 8 pairs
    timeLimit: null,
    hintDelay: 12000,
    patternLength: 4,
    soundCount: 6,
  },
  advanced: {
    gridSize: { cols: 4, rows: 5 }, // 20 cards = 10 pairs
    timeLimit: null,
    hintDelay: 15000,
    patternLength: 5,
    soundCount: 8,
  },
} as const;

// Autism-friendly color palette (high contrast, not overwhelming)
export const GAME_COLORS = {
  primary: 'hsl(var(--primary))',
  success: 'hsl(142, 76%, 36%)', // Green
  error: 'hsl(0, 84%, 60%)', // Red  
  highlight: 'hsl(45, 93%, 47%)', // Gold
  neutral: 'hsl(var(--muted))',
  cardBack: 'hsl(220, 14%, 96%)',
};

// Card symbols for memory game (simple, recognizable)
export const MEMORY_SYMBOLS = [
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'heart', emoji: '❤️', label: 'Heart' },
  { id: 'moon', emoji: '🌙', label: 'Moon' },
  { id: 'sun', emoji: '☀️', label: 'Sun' },
  { id: 'flower', emoji: '🌸', label: 'Flower' },
  { id: 'tree', emoji: '🌳', label: 'Tree' },
  { id: 'fish', emoji: '🐟', label: 'Fish' },
  { id: 'bird', emoji: '🐦', label: 'Bird' },
  { id: 'cat', emoji: '🐱', label: 'Cat' },
  { id: 'dog', emoji: '🐕', label: 'Dog' },
  { id: 'apple', emoji: '🍎', label: 'Apple' },
  { id: 'rainbow', emoji: '🌈', label: 'Rainbow' },
];

// Pattern shapes
export const PATTERN_SHAPES = [
  { id: 'circle', color: '#FF6B6B', label: 'Red Circle' },
  { id: 'square', color: '#4ECDC4', label: 'Teal Square' },
  { id: 'triangle', color: '#FFE66D', label: 'Yellow Triangle' },
  { id: 'diamond', color: '#95E1D3', label: 'Green Diamond' },
  { id: 'star', color: '#DDA0DD', label: 'Purple Star' },
  { id: 'hexagon', color: '#87CEEB', label: 'Blue Hexagon' },
];

// Sound items for matching game
export const SOUND_ITEMS = [
  { id: 'dog', label: 'Dog', emoji: '🐕', category: 'animal' },
  { id: 'cat', label: 'Cat', emoji: '🐱', category: 'animal' },
  { id: 'cow', label: 'Cow', emoji: '🐄', category: 'animal' },
  { id: 'bird', label: 'Bird', emoji: '🐦', category: 'animal' },
  { id: 'lion', label: 'Lion', emoji: '🦁', category: 'animal' },
  { id: 'elephant', label: 'Elephant', emoji: '🐘', category: 'animal' },
  { id: 'piano', label: 'Piano', emoji: '🎹', category: 'instrument' },
  { id: 'drum', label: 'Drum', emoji: '🥁', category: 'instrument' },
  { id: 'guitar', label: 'Guitar', emoji: '🎸', category: 'instrument' },
  { id: 'bell', label: 'Bell', emoji: '🔔', category: 'instrument' },
  { id: 'rain', label: 'Rain', emoji: '🌧️', category: 'environment' },
  { id: 'thunder', label: 'Thunder', emoji: '⛈️', category: 'environment' },
];

/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get difficulty config from skill level
 */
export function getDifficultyFromSkillLevel(level: SkillLevel = 'beginner') {
  const mapping: Record<SkillLevel, keyof typeof DIFFICULTY_CONFIG> = {
    beginner: 'beginner',
    intermediate: 'intermediate',
    advanced: 'advanced',
    expert: 'advanced',
  };
  return DIFFICULTY_CONFIG[mapping[level]];
}

/**
 * Create pairs for memory game
 */
export function createMemoryPairs(pairCount: number) {
  const symbols = shuffleArray(MEMORY_SYMBOLS).slice(0, pairCount);
  const pairs = symbols.flatMap((symbol, index) => [
    { ...symbol, pairId: index, uniqueId: `${symbol.id}-a` },
    { ...symbol, pairId: index, uniqueId: `${symbol.id}-b` },
  ]);
  return shuffleArray(pairs);
}

/**
 * Generate a random pattern sequence
 */
export function generatePattern(length: number) {
  const shapes = shuffleArray(PATTERN_SHAPES);
  const pattern: typeof PATTERN_SHAPES[number][] = [];
  for (let i = 0; i < length; i++) {
    pattern.push(shapes[i % shapes.length]);
  }
  return pattern;
}

/**
 * Play a simple sound using Web Audio API
 */
export function playSound(type: 'correct' | 'incorrect' | 'complete' | 'click') {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const frequencies: Record<typeof type, number[]> = {
      correct: [523, 659, 784], // C-E-G chord
      incorrect: [349, 311], // Low notes
      complete: [523, 659, 784, 1047], // Ascending
      click: [440],
    };
    
    const durations: Record<typeof type, number> = {
      correct: 0.15,
      incorrect: 0.2,
      complete: 0.2,
      click: 0.05,
    };
    
    const freq = frequencies[type];
    const duration = durations[type];
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration * freq.length);
    
    freq.forEach((f, i) => {
      oscillator.frequency.setValueAtTime(f, audioContext.currentTime + i * duration);
    });
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration * freq.length);
  } catch (e) {
    // Audio not supported or blocked
    cDebug('Audio playback not available');
  }
}

/**
 * Generate audio for animal/environment sounds (simple synthesized sounds)
 */
export function playSynthesizedSound(soundId: string) {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Simple synthesized representations
    const soundConfigs: Record<string, { freq: number; type: OscillatorType; duration: number }> = {
      dog: { freq: 300, type: 'sawtooth', duration: 0.3 },
      cat: { freq: 600, type: 'sine', duration: 0.4 },
      cow: { freq: 150, type: 'square', duration: 0.8 },
      bird: { freq: 1000, type: 'sine', duration: 0.2 },
      lion: { freq: 120, type: 'sawtooth', duration: 0.6 },
      elephant: { freq: 80, type: 'triangle', duration: 0.7 },
      piano: { freq: 440, type: 'sine', duration: 0.5 },
      drum: { freq: 100, type: 'square', duration: 0.15 },
      guitar: { freq: 330, type: 'sawtooth', duration: 0.4 },
      bell: { freq: 880, type: 'sine', duration: 0.6 },
      rain: { freq: 400, type: 'triangle', duration: 0.8 },
      thunder: { freq: 80, type: 'sawtooth', duration: 1.0 },
    };
    
    const config = soundConfigs[soundId] || { freq: 440, type: 'sine' as OscillatorType, duration: 0.3 };
    
    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.freq, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + config.duration);
  } catch (e) {
    cDebug('Audio playback not available');
  }
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
