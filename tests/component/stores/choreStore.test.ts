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
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
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

describe('choreStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useChoreStore.setState({
      chores: [],
      assignments: [],
      completions: [],
      templates: [],
      categories: [],
      selectedChore: null,
      selectedAssignment: null,
      isLoading: false,
      error: null,
      filters: {
        status: 'all',
        assignedTo: null,
        category: null,
        dateRange: null,
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useChoreStore.getState();
      
      expect(state.chores).toEqual([]);
      expect(state.assignments).toEqual([]);
      expect(state.completions).toEqual([]);
      expect(state.templates).toEqual([]);
      expect(state.categories).toEqual([]);
      expect(state.selectedChore).toBeNull();
      expect(state.selectedAssignment).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should have default filter values', () => {
      const { filters } = useChoreStore.getState();
      
      expect(filters.status).toBe('all');
      expect(filters.assignedTo).toBeNull();
      expect(filters.category).toBeNull();
      expect(filters.dateRange).toBeNull();
    });
  });

  describe('state setters', () => {
    it('should set chores correctly', () => {
      const { setChores } = useChoreStore.getState();
      const mockChores = [
        { id: '1', title: 'Clean room', description: 'Clean your bedroom' },
        { id: '2', title: 'Do dishes', description: 'Wash the dishes' },
      ];
      
      setChores(mockChores as any);
      
      expect(useChoreStore.getState().chores).toEqual(mockChores);
    });

    it('should set assignments correctly', () => {
      const { setAssignments } = useChoreStore.getState();
      const mockAssignments = [
        { id: '1', chore_id: '1', assigned_to: 'user-1', status: 'pending' },
      ];
      
      setAssignments(mockAssignments as any);
      
      expect(useChoreStore.getState().assignments).toEqual(mockAssignments);
    });

    it('should set loading state correctly', () => {
      const { setIsLoading } = useChoreStore.getState();
      
      setIsLoading(true);
      
      expect(useChoreStore.getState().isLoading).toBe(true);
    });

    it('should set error correctly', () => {
      const { setError } = useChoreStore.getState();
      
      setError('Failed to load chores');
      
      expect(useChoreStore.getState().error).toBe('Failed to load chores');
    });

    it('should set selected chore correctly', () => {
      const { setSelectedChore } = useChoreStore.getState();
      const mockChore = { id: '1', title: 'Test Chore' };
      
      setSelectedChore(mockChore as any);
      
      expect(useChoreStore.getState().selectedChore).toEqual(mockChore);
    });

    it('should set selected assignment correctly', () => {
      const { setSelectedAssignment } = useChoreStore.getState();
      const mockAssignment = { id: '1', chore_id: '1', status: 'pending' };
      
      setSelectedAssignment(mockAssignment as any);
      
      expect(useChoreStore.getState().selectedAssignment).toEqual(mockAssignment);
    });
  });

  describe('filter operations', () => {
    it('should update status filter', () => {
      const { setFilters } = useChoreStore.getState();
      
      setFilters({ status: 'completed' });
      
      expect(useChoreStore.getState().filters.status).toBe('completed');
    });

    it('should update assignedTo filter', () => {
      const { setFilters } = useChoreStore.getState();
      
      setFilters({ assignedTo: 'user-123' });
      
      expect(useChoreStore.getState().filters.assignedTo).toBe('user-123');
    });

    it('should update category filter', () => {
      const { setFilters } = useChoreStore.getState();
      
      setFilters({ category: 'cleaning' });
      
      expect(useChoreStore.getState().filters.category).toBe('cleaning');
    });

    it('should update multiple filters at once', () => {
      const { setFilters } = useChoreStore.getState();
      
      setFilters({
        status: 'pending',
        assignedTo: 'user-456',
        category: 'outdoor',
      });
      
      const { filters } = useChoreStore.getState();
      expect(filters.status).toBe('pending');
      expect(filters.assignedTo).toBe('user-456');
      expect(filters.category).toBe('outdoor');
    });

    it('should reset filters', () => {
      const { setFilters, resetFilters } = useChoreStore.getState();
      
      // Set some filters first
      setFilters({
        status: 'completed',
        assignedTo: 'user-123',
        category: 'cleaning',
      });
      
      // Reset
      resetFilters();
      
      const { filters } = useChoreStore.getState();
      expect(filters.status).toBe('all');
      expect(filters.assignedTo).toBeNull();
      expect(filters.category).toBeNull();
    });
  });

  describe('chore operations', () => {
    it('should add a chore', () => {
      const { addChore } = useChoreStore.getState();
      const newChore = { id: '3', title: 'New Chore', description: 'Test' };
      
      addChore(newChore as any);
      
      expect(useChoreStore.getState().chores).toContainEqual(newChore);
    });

    it('should update a chore', () => {
      const { setChores, updateChore } = useChoreStore.getState();
      const initialChores = [
        { id: '1', title: 'Original Title', description: 'Original' },
      ];
      
      setChores(initialChores as any);
      updateChore('1', { title: 'Updated Title' });
      
      const updatedChore = useChoreStore.getState().chores.find(c => c.id === '1');
      expect(updatedChore?.title).toBe('Updated Title');
    });

    it('should remove a chore', () => {
      const { setChores, removeChore } = useChoreStore.getState();
      const initialChores = [
        { id: '1', title: 'Chore 1' },
        { id: '2', title: 'Chore 2' },
      ];
      
      setChores(initialChores as any);
      removeChore('1');
      
      const chores = useChoreStore.getState().chores;
      expect(chores.length).toBe(1);
      expect(chores[0].id).toBe('2');
    });
  });

  describe('clearStore', () => {
    it('should clear all store data', () => {
      const { setChores, setAssignments, setError, clearStore } = useChoreStore.getState();
      
      // Set some data
      setChores([{ id: '1', title: 'Test' }] as any);
      setAssignments([{ id: '1', chore_id: '1' }] as any);
      setError('Some error');
      
      // Clear
      clearStore();
      
      const state = useChoreStore.getState();
      expect(state.chores).toEqual([]);
      expect(state.assignments).toEqual([]);
      expect(state.error).toBeNull();
    });
  });
});
