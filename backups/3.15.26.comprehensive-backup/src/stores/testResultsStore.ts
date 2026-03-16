/**
 * Test Results Store
 * 
 * @description Zustand store for managing imported Playwright test results
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ParsedTestRun } from '@/types/testCoverage';
import { parsePlaywrightJSON, validatePlaywrightJSON } from '@/utils/playwrightResultsParser';

interface TestResultsState {
  currentRun: ParsedTestRun | null;
  runHistory: ParsedTestRun[];
  isLoading: boolean;
  error: string | null;
}

interface TestResultsActions {
  importResults: (file: File) => Promise<void>;
  importFromJSON: (json: unknown, fileName: string) => void;
  clearCurrentRun: () => void;
  selectHistoricalRun: (id: string) => void;
  deleteHistoricalRun: (id: string) => void;
  clearError: () => void;
  clearAllHistory: () => void;
}

type TestResultsStore = TestResultsState & TestResultsActions;

const MAX_HISTORY_SIZE = 10;

export const useTestResultsStore = create<TestResultsStore>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        currentRun: null,
        runHistory: [],
        isLoading: false,
        error: null,

        // Actions
        importResults: async (file: File) => {
          set({ isLoading: true, error: null });

          try {
            const text = await file.text();
            const json = JSON.parse(text);
            
            const validation = validatePlaywrightJSON(json);
            if (!validation.valid) {
              set({ 
                isLoading: false, 
                error: `Invalid Playwright JSON: ${validation.errors.join(', ')}` 
              });
              return;
            }

            const parsedRun = parsePlaywrightJSON(json, file.name);
            const { runHistory } = get();
            
            // Add to history, keeping max size
            const newHistory = [parsedRun, ...runHistory].slice(0, MAX_HISTORY_SIZE);

            set({
              currentRun: parsedRun,
              runHistory: newHistory,
              isLoading: false,
              error: null,
            });
          } catch (err) {
            set({
              isLoading: false,
              error: err instanceof Error ? err.message : 'Failed to parse JSON file',
            });
          }
        },

        importFromJSON: (json: unknown, fileName: string) => {
          const validation = validatePlaywrightJSON(json);
          if (!validation.valid) {
            set({ error: `Invalid Playwright JSON: ${validation.errors.join(', ')}` });
            return;
          }

          const parsedRun = parsePlaywrightJSON(json as Record<string, unknown>, fileName);
          const { runHistory } = get();
          const newHistory = [parsedRun, ...runHistory].slice(0, MAX_HISTORY_SIZE);

          set({
            currentRun: parsedRun,
            runHistory: newHistory,
            error: null,
          });
        },

        clearCurrentRun: () => {
          set({ currentRun: null, error: null });
        },

        selectHistoricalRun: (id: string) => {
          const { runHistory } = get();
          const run = runHistory.find(r => r.id === id);
          if (run) {
            set({ currentRun: run, error: null });
          }
        },

        deleteHistoricalRun: (id: string) => {
          const { runHistory, currentRun } = get();
          const newHistory = runHistory.filter(r => r.id !== id);
          set({
            runHistory: newHistory,
            currentRun: currentRun?.id === id ? null : currentRun,
          });
        },

        clearError: () => {
          set({ error: null });
        },

        clearAllHistory: () => {
          set({ runHistory: [], currentRun: null });
        },
      }),
      {
        name: 'test-results-storage',
        partialize: (state) => ({
          runHistory: state.runHistory.slice(0, MAX_HISTORY_SIZE),
        }),
      }
    ),
    { name: 'TestResultsStore' }
  )
);
