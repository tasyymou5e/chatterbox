/**
 * useChoreManagement Hook Tests
 * 
 * Tests for the chore management hook including CRUD operations and state management.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-chore-id' }, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user-id' } }, 
        error: null 
      })),
      getSession: vi.fn(() => Promise.resolve({ 
        data: { session: { user: { id: 'test-user-id' } } }, 
        error: null 
      }))
    }
  }
}));

// Mock the chore store
const mockChoreStore = {
  categories: [],
  templates: [],
  chores: [],
  assignments: [],
  loading: false,
  error: null,
  selectedFamilyId: null,
  setFamilyId: vi.fn(),
  fetchCategories: vi.fn(() => Promise.resolve()),
  fetchTemplates: vi.fn(() => Promise.resolve()),
  fetchChores: vi.fn(() => Promise.resolve()),
  fetchAssignments: vi.fn(() => Promise.resolve()),
  createChoreFromTemplate: vi.fn(() => Promise.resolve({ success: true })),
  createCustomChore: vi.fn(() => Promise.resolve({ success: true })),
  assignChore: vi.fn(() => Promise.resolve({ success: true })),
  bulkAssignChores: vi.fn(() => Promise.resolve({ success: true })),
  updateAssignmentStatus: vi.fn(() => Promise.resolve({ success: true })),
  reset: vi.fn()
};

vi.mock('@/stores/choreStore', () => ({
  useChoreStore: vi.fn(() => mockChoreStore)
}));

// Mock UI store
vi.mock('@/stores/uiStore', () => ({
  useUIStore: vi.fn(() => ({
    loadingStates: {},
    setLoading: vi.fn(),
    clearLoading: vi.fn()
  }))
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
  },
});

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useChoreManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty state', async () => {
    const { useChoreManagement } = await import('@/hooks/useChoreManagement');
    
    const { result } = renderHook(() => useChoreManagement('test-family-id'), {
      wrapper: createWrapper()
    });
    
    await waitFor(() => {
      expect(result.current.categories).toBeDefined();
      expect(result.current.templates).toBeDefined();
      expect(result.current.chores).toBeDefined();
      expect(result.current.assignments).toBeDefined();
    });
  });

  it('should set family ID on initialization', async () => {
    const { useChoreManagement } = await import('@/hooks/useChoreManagement');
    
    const familyId = 'test-family-123';
    renderHook(() => useChoreManagement(familyId), {
      wrapper: createWrapper()
    });
    
    await waitFor(() => {
      expect(mockChoreStore.setFamilyId).toHaveBeenCalledWith(familyId);
    });
  });

  it('should expose loading states', async () => {
    const { useChoreManagement } = await import('@/hooks/useChoreManagement');
    
    const { result } = renderHook(() => useChoreManagement('test-family-id'), {
      wrapper: createWrapper()
    });
    
    expect(result.current.loadingStates).toBeDefined();
    expect(typeof result.current.loading).toBe('boolean');
  });

  it('should provide refetch function', async () => {
    const { useChoreManagement } = await import('@/hooks/useChoreManagement');
    
    const { result } = renderHook(() => useChoreManagement('test-family-id'), {
      wrapper: createWrapper()
    });
    
    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('useChoreManagement Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide createChoreFromTemplate function', async () => {
    const { useChoreManagement } = await import('@/hooks/useChoreManagement');
    
    const { result } = renderHook(() => useChoreManagement('test-family-id'), {
      wrapper: createWrapper()
    });
    
    expect(typeof result.current.createChoreFromTemplate).toBe('function');
  });

  it('should provide assignChore function', async () => {
    const { useChoreManagement } = await import('@/hooks/useChoreManagement');
    
    const { result } = renderHook(() => useChoreManagement('test-family-id'), {
      wrapper: createWrapper()
    });
    
    expect(typeof result.current.assignChore).toBe('function');
  });

  it('should provide updateAssignmentStatus function', async () => {
    const { useChoreManagement } = await import('@/hooks/useChoreManagement');
    
    const { result } = renderHook(() => useChoreManagement('test-family-id'), {
      wrapper: createWrapper()
    });
    
    expect(typeof result.current.updateAssignmentStatus).toBe('function');
  });
});
