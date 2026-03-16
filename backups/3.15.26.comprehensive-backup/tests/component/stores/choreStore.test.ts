import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useChoreStore } from '@/stores/choreStore';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          in: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
  },
}));

// Mock storeUtils
vi.mock('@/services/storeUtils', () => ({
  choreInputSchema: { parse: vi.fn() },
  getCurrentUserId: vi.fn(() => 'test-user-id'),
  requireAuth: vi.fn(() => 'test-user-id'),
  sanitizeInput: vi.fn((s: string) => s),
  createStoreError: vi.fn((type: string, msg: string) => ({ type, message: msg })),
  createStoreSuccess: vi.fn((data: unknown, msg: string) => ({ data, message: msg })),
}));

describe('choreStore', () => {
  beforeEach(() => {
    // Reset store state to match actual initial values
    useChoreStore.setState({
      categories: [],
      templates: [],
      chores: [],
      assignments: [],
      loading: true,
      error: null,
      familyId: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useChoreStore.getState();
      
      expect(state.categories).toEqual([]);
      expect(state.templates).toEqual([]);
      expect(state.chores).toEqual([]);
      expect(state.assignments).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.familyId).toBeNull();
    });
  });

  describe('setFamilyId', () => {
    it('should set family ID', () => {
      const { setFamilyId } = useChoreStore.getState();
      
      setFamilyId('family-123');
      
      expect(useChoreStore.getState().familyId).toBe('family-123');
    });

    it('should accept null to clear family ID', () => {
      useChoreStore.setState({ familyId: 'family-123' });
      
      const { setFamilyId } = useChoreStore.getState();
      setFamilyId(null);
      
      expect(useChoreStore.getState().familyId).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear the error state', () => {
      useChoreStore.setState({ error: { type: 'network', message: 'Failed' } as any });
      
      const { clearError } = useChoreStore.getState();
      clearError();
      
      expect(useChoreStore.getState().error).toBeNull();
    });
  });

  describe('store actions exist', () => {
    it('should have all required action methods', () => {
      const state = useChoreStore.getState();
      
      expect(typeof state.setFamilyId).toBe('function');
      expect(typeof state.fetchCategories).toBe('function');
      expect(typeof state.fetchTemplates).toBe('function');
      expect(typeof state.fetchChores).toBe('function');
      expect(typeof state.fetchAssignments).toBe('function');
      expect(typeof state.createChoreFromTemplate).toBe('function');
      expect(typeof state.createCustomChore).toBe('function');
      expect(typeof state.assignChore).toBe('function');
      expect(typeof state.bulkAssignChores).toBe('function');
      expect(typeof state.updateAssignmentStatus).toBe('function');
      expect(typeof state.refetch).toBe('function');
      expect(typeof state.clearError).toBe('function');
    });
  });

  describe('createChoreFromTemplate', () => {
    it('should fail without family ID', async () => {
      useChoreStore.setState({ familyId: null });
      
      const { createChoreFromTemplate } = useChoreStore.getState();
      const result = await createChoreFromTemplate('template-1');
      
      expect(result.success).toBe(false);
    });
  });

  describe('assignChore', () => {
    it('should fail without family ID', async () => {
      useChoreStore.setState({ familyId: null });
      
      const { assignChore } = useChoreStore.getState();
      const result = await assignChore('chore-1', 'user-1');
      
      expect(result.success).toBe(false);
    });
  });
});
