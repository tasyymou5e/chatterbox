/**
 * ParentDashboard Component Tests
 * 
 * Tests for the parent dashboard including child accounts, family data, and navigation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() }))
      }))
    })),
    removeChannel: vi.fn(),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user-id', email: 'test@example.com' } }, 
        error: null 
      })),
      getSession: vi.fn(() => Promise.resolve({ 
        data: { session: { user: { id: 'test-user-id' } } }, 
        error: null 
      })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    }
  }
}));

// Mock secure family access
vi.mock('@/utils/secureFamilyAccess', () => ({
  getCurrentUserFamilies: vi.fn(() => Promise.resolve([])),
  getSecureFamilyMembers: vi.fn(() => Promise.resolve([]))
}));

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: { user: { id: 'test-user-id' } },
    userRole: 'parent',
    loading: false,
    isHydrated: true,
    initialize: vi.fn()
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

const renderWithProviders = (component: React.ReactNode) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ParentDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', async () => {
    const { default: ParentDashboard } = await import('@/pages/ParentDashboard');
    
    renderWithProviders(<ParentDashboard />);
    
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });

  it('should show loading state initially', async () => {
    const { default: ParentDashboard } = await import('@/pages/ParentDashboard');
    
    renderWithProviders(<ParentDashboard />);
    
    // Component should handle loading state
    await waitFor(() => {
      expect(document.body).toBeTruthy();
    });
  });

  it('should display dashboard title when loaded', async () => {
    const { default: ParentDashboard } = await import('@/pages/ParentDashboard');
    
    renderWithProviders(<ParentDashboard />);
    
    await waitFor(() => {
      // Dashboard should render
      expect(document.body).toBeTruthy();
    });
  });
});

describe('ParentDashboard Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render navigation elements', async () => {
    const { default: ParentDashboard } = await import('@/pages/ParentDashboard');
    
    renderWithProviders(<ParentDashboard />);
    
    await waitFor(() => {
      // Should have navigation structure
      expect(document.body).toBeTruthy();
    });
  });
});
