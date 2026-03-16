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
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
  },
}));

// Mock storeUtils
vi.mock('@/services/storeUtils', () => ({
  wishlistInputSchema: { parse: vi.fn() },
  sanitizeInput: vi.fn((s: string) => s),
  createStoreError: vi.fn((type: string, msg: string) => ({ type, message: msg })),
  createStoreSuccess: vi.fn((data: unknown, msg: string) => ({ data, message: msg })),
}));

// Mock wideLogger
vi.mock('@/utils/wideLogger', () => ({
  cLog: vi.fn(),
  cError: vi.fn(),
}));

describe('gamificationStore', () => {
  beforeEach(() => {
    // Reset store state to match actual initial values
    useGamificationStore.setState({
      userLevel: null,
      userPoints: null,
      achievements: [],
      userAchievements: [],
      wishlistItems: [],
      dailyStreaks: [],
      leaderboard: [],
      loading: true,
      error: null,
      userId: null,
      familyId: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useGamificationStore.getState();
      
      expect(state.userLevel).toBeNull();
      expect(state.userPoints).toBeNull();
      expect(state.achievements).toEqual([]);
      expect(state.userAchievements).toEqual([]);
      expect(state.wishlistItems).toEqual([]);
      expect(state.dailyStreaks).toEqual([]);
      expect(state.leaderboard).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.userId).toBeNull();
      expect(state.familyId).toBeNull();
    });
  });

  describe('setUserId', () => {
    it('should set user ID', () => {
      const { setUserId } = useGamificationStore.getState();
      
      setUserId('user-123');
      
      expect(useGamificationStore.getState().userId).toBe('user-123');
    });

    it('should accept null to clear user ID', () => {
      useGamificationStore.setState({ userId: 'user-123' });
      
      const { setUserId } = useGamificationStore.getState();
      setUserId(null);
      
      expect(useGamificationStore.getState().userId).toBeNull();
    });
  });

  describe('setFamilyId', () => {
    it('should set family ID', () => {
      const { setFamilyId } = useGamificationStore.getState();
      
      setFamilyId('family-456');
      
      expect(useGamificationStore.getState().familyId).toBe('family-456');
    });
  });

  describe('clearError', () => {
    it('should clear the error state', () => {
      useGamificationStore.setState({ error: { type: 'network', message: 'Failed' } as any });
      
      const { clearError } = useGamificationStore.getState();
      clearError();
      
      expect(useGamificationStore.getState().error).toBeNull();
    });
  });

  describe('store actions exist', () => {
    it('should have all required action methods', () => {
      const state = useGamificationStore.getState();
      
      expect(typeof state.setUserId).toBe('function');
      expect(typeof state.setFamilyId).toBe('function');
      expect(typeof state.fetchUserLevel).toBe('function');
      expect(typeof state.fetchUserPoints).toBe('function');
      expect(typeof state.fetchAchievements).toBe('function');
      expect(typeof state.fetchUserAchievements).toBe('function');
      expect(typeof state.fetchWishlistItems).toBe('function');
      expect(typeof state.fetchDailyStreaks).toBe('function');
      expect(typeof state.fetchLeaderboard).toBe('function');
      expect(typeof state.addWishlistItem).toBe('function');
      expect(typeof state.redeemWishlistItem).toBe('function');
      expect(typeof state.checkAchievements).toBe('function');
      expect(typeof state.refetch).toBe('function');
      expect(typeof state.clearError).toBe('function');
    });
  });

  describe('addWishlistItem', () => {
    it('should fail without authentication', async () => {
      useGamificationStore.setState({ userId: null, familyId: null });
      
      const { addWishlistItem } = useGamificationStore.getState();
      const result = await addWishlistItem({
        item_name: 'Test Item',
        point_cost: 100,
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('redeemWishlistItem', () => {
    it('should fail without authentication', async () => {
      useGamificationStore.setState({ userId: null, familyId: null });
      
      const { redeemWishlistItem } = useGamificationStore.getState();
      const result = await redeemWishlistItem('item-1');
      
      expect(result.success).toBe(false);
    });
  });
});
