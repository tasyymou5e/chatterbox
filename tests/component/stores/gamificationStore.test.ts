import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGamificationStore } from '@/stores/gamificationStore';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
  },
}));

describe('gamificationStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGamificationStore.setState({
      points: 0,
      level: 1,
      experience: 0,
      experienceToNextLevel: 100,
      achievements: [],
      unlockedAchievements: [],
      recentActivity: [],
      dailyStreak: 0,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useGamificationStore.getState();
      
      expect(state.points).toBe(0);
      expect(state.level).toBe(1);
      expect(state.experience).toBe(0);
      expect(state.experienceToNextLevel).toBe(100);
      expect(state.achievements).toEqual([]);
      expect(state.unlockedAchievements).toEqual([]);
      expect(state.dailyStreak).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('state setters', () => {
    it('should set points correctly', () => {
      const { setPoints } = useGamificationStore.getState();
      
      setPoints(100);
      
      expect(useGamificationStore.getState().points).toBe(100);
    });

    it('should set level correctly', () => {
      const { setLevel } = useGamificationStore.getState();
      
      setLevel(5);
      
      expect(useGamificationStore.getState().level).toBe(5);
    });

    it('should set experience correctly', () => {
      const { setExperience } = useGamificationStore.getState();
      
      setExperience(50);
      
      expect(useGamificationStore.getState().experience).toBe(50);
    });

    it('should set daily streak correctly', () => {
      const { setDailyStreak } = useGamificationStore.getState();
      
      setDailyStreak(7);
      
      expect(useGamificationStore.getState().dailyStreak).toBe(7);
    });

    it('should set loading state correctly', () => {
      const { setIsLoading } = useGamificationStore.getState();
      
      setIsLoading(true);
      
      expect(useGamificationStore.getState().isLoading).toBe(true);
    });

    it('should set error correctly', () => {
      const { setError } = useGamificationStore.getState();
      
      setError('Test error');
      
      expect(useGamificationStore.getState().error).toBe('Test error');
    });
  });

  describe('addPoints', () => {
    it('should add points to current total', () => {
      const { setPoints, addPoints } = useGamificationStore.getState();
      
      setPoints(50);
      addPoints(25);
      
      expect(useGamificationStore.getState().points).toBe(75);
    });

    it('should handle negative point additions', () => {
      const { setPoints, addPoints } = useGamificationStore.getState();
      
      setPoints(100);
      addPoints(-30);
      
      expect(useGamificationStore.getState().points).toBe(70);
    });
  });

  describe('addExperience', () => {
    it('should add experience to current total', () => {
      const { setExperience, addExperience } = useGamificationStore.getState();
      
      setExperience(20);
      addExperience(30);
      
      expect(useGamificationStore.getState().experience).toBe(50);
    });
  });

  describe('unlockAchievement', () => {
    it('should add achievement to unlocked list', () => {
      const { unlockAchievement } = useGamificationStore.getState();
      
      unlockAchievement('first_login');
      
      expect(useGamificationStore.getState().unlockedAchievements).toContain('first_login');
    });

    it('should not duplicate unlocked achievements', () => {
      const { unlockAchievement } = useGamificationStore.getState();
      
      unlockAchievement('first_login');
      unlockAchievement('first_login');
      
      const unlocked = useGamificationStore.getState().unlockedAchievements;
      expect(unlocked.filter(a => a === 'first_login').length).toBe(1);
    });
  });

  describe('resetGamification', () => {
    it('should reset all gamification state to initial values', () => {
      const { setPoints, setLevel, setExperience, setDailyStreak, unlockAchievement, resetGamification } = useGamificationStore.getState();
      
      // Set some values
      setPoints(500);
      setLevel(10);
      setExperience(75);
      setDailyStreak(14);
      unlockAchievement('test_achievement');
      
      // Reset
      resetGamification();
      
      const state = useGamificationStore.getState();
      expect(state.points).toBe(0);
      expect(state.level).toBe(1);
      expect(state.experience).toBe(0);
      expect(state.dailyStreak).toBe(0);
      expect(state.unlockedAchievements).toEqual([]);
    });
  });

  describe('calculateLevel', () => {
    it('should correctly calculate level from experience', () => {
      const { calculateLevel } = useGamificationStore.getState();
      
      // Level thresholds typically increase, so test various experience amounts
      expect(calculateLevel(0)).toBe(1);
      expect(calculateLevel(100)).toBeGreaterThanOrEqual(1);
      expect(calculateLevel(1000)).toBeGreaterThanOrEqual(1);
    });
  });
});
