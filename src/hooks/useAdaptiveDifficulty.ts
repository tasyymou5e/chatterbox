/**
 * useAdaptiveDifficulty – auto-adjusts game difficulty per skill domain
 * based on a rolling window of recent accuracy scores.
 *
 * Rules:
 *  - Promote (easy→medium→hard) after 3 consecutive games ≥80% accuracy
 *  - Demote (hard→medium→easy) after 2 consecutive games ≤40% accuracy
 *  - Manual override is always respected until the next auto-adjustment
 */
import { useState, useCallback, useMemo } from 'react';

export type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];
const PROMOTE_THRESHOLD = 0.8;
const DEMOTE_THRESHOLD = 0.4;
const PROMOTE_STREAK = 3;
const DEMOTE_STREAK = 2;
const MAX_HISTORY = 10;

interface DomainHistory {
  accuracies: number[]; // most-recent last
  currentDifficulty: Difficulty;
}

export interface AdaptiveDifficultyResult {
  getDifficulty: (domain: string) => Difficulty;
  recordResult: (domain: string, score: number, total: number) => Difficulty;
  setManualDifficulty: (domain: string, difficulty: Difficulty) => void;
  getHistory: (domain: string) => { accuracies: number[]; difficulty: Difficulty };
  getSuggestion: (domain: string) => 'promote' | 'demote' | 'stay';
}

export function useAdaptiveDifficulty(
  initialDifficulties?: Record<string, Difficulty>,
): AdaptiveDifficultyResult {
  const [domains, setDomains] = useState<Record<string, DomainHistory>>(() => {
    const init: Record<string, DomainHistory> = {};
    if (initialDifficulties) {
      for (const [d, diff] of Object.entries(initialDifficulties)) {
        init[d] = { accuracies: [], currentDifficulty: diff };
      }
    }
    return init;
  });

  const getOrCreate = useCallback(
    (domain: string): DomainHistory =>
      domains[domain] ?? { accuracies: [], currentDifficulty: 'easy' },
    [domains],
  );

  const getDifficulty = useCallback(
    (domain: string): Difficulty => getOrCreate(domain).currentDifficulty,
    [getOrCreate],
  );

  const computeAdjustment = (history: DomainHistory): 'promote' | 'demote' | 'stay' => {
    const { accuracies, currentDifficulty } = history;
    if (accuracies.length === 0) return 'stay';

    // Check promotion: last N games all above threshold
    if (currentDifficulty !== 'hard' && accuracies.length >= PROMOTE_STREAK) {
      const tail = accuracies.slice(-PROMOTE_STREAK);
      if (tail.every((a) => a >= PROMOTE_THRESHOLD)) return 'promote';
    }

    // Check demotion: last N games all below threshold
    if (currentDifficulty !== 'easy' && accuracies.length >= DEMOTE_STREAK) {
      const tail = accuracies.slice(-DEMOTE_STREAK);
      if (tail.every((a) => a <= DEMOTE_THRESHOLD)) return 'demote';
    }

    return 'stay';
  };

  const applyAdjustment = (current: Difficulty, direction: 'promote' | 'demote' | 'stay'): Difficulty => {
    const idx = DIFFICULTY_ORDER.indexOf(current);
    if (direction === 'promote') return DIFFICULTY_ORDER[Math.min(idx + 1, 2)];
    if (direction === 'demote') return DIFFICULTY_ORDER[Math.max(idx - 1, 0)];
    return current;
  };

  const recordResult = useCallback(
    (domain: string, score: number, total: number): Difficulty => {
      const accuracy = total > 0 ? score / total : 0;
      let newDifficulty: Difficulty = 'easy';

      setDomains((prev) => {
        const existing = prev[domain] ?? { accuracies: [], currentDifficulty: 'easy' };
        const updatedAccuracies = [...existing.accuracies, accuracy].slice(-MAX_HISTORY);
        const updatedHistory: DomainHistory = {
          ...existing,
          accuracies: updatedAccuracies,
        };
        const adjustment = computeAdjustment(updatedHistory);
        newDifficulty = applyAdjustment(updatedHistory.currentDifficulty, adjustment);

        return {
          ...prev,
          [domain]: {
            accuracies: updatedAccuracies,
            currentDifficulty: newDifficulty,
          },
        };
      });

      return newDifficulty;
    },
    [],
  );

  const setManualDifficulty = useCallback((domain: string, difficulty: Difficulty) => {
    setDomains((prev) => ({
      ...prev,
      [domain]: {
        ...(prev[domain] ?? { accuracies: [] }),
        currentDifficulty: difficulty,
      },
    }));
  }, []);

  const getHistory = useCallback(
    (domain: string) => {
      const h = getOrCreate(domain);
      return { accuracies: h.accuracies, difficulty: h.currentDifficulty };
    },
    [getOrCreate],
  );

  const getSuggestion = useCallback(
    (domain: string): 'promote' | 'demote' | 'stay' => computeAdjustment(getOrCreate(domain)),
    [getOrCreate],
  );

  return useMemo(
    () => ({ getDifficulty, recordResult, setManualDifficulty, getHistory, getSuggestion }),
    [getDifficulty, recordResult, setManualDifficulty, getHistory, getSuggestion],
  );
}
