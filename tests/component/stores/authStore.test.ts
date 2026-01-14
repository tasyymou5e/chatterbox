import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import type { User, Session } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
    },
    rpc: vi.fn(),
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({ data: null, error: null }))
        }))
      }))
    })),
  },
}));

// Import the mocked supabase
import { supabase } from '@/integrations/supabase/client';

const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
};

const mockSession: Session = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      session: null,
      userRole: null,
      isAdmin: false,
      isHydrated: true,
      loading: false,
      isInitialized: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useAuthStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.userRole).toBeNull();
      expect(state.isAdmin).toBe(false);
      expect(state.loading).toBe(false);
    });
  });

  describe('state setters', () => {
    it('should set user correctly', () => {
      const { setUser } = useAuthStore.getState();
      
      setUser(mockUser);
      
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it('should set session correctly', () => {
      const { setSession } = useAuthStore.getState();
      
      setSession(mockSession);
      
      expect(useAuthStore.getState().session).toEqual(mockSession);
    });

    it('should set userRole correctly', () => {
      const { setUserRole } = useAuthStore.getState();
      
      setUserRole('parent');
      
      expect(useAuthStore.getState().userRole).toBe('parent');
    });

    it('should set isAdmin correctly', () => {
      const { setIsAdmin } = useAuthStore.getState();
      
      setIsAdmin(true);
      
      expect(useAuthStore.getState().isAdmin).toBe(true);
    });

    it('should set loading correctly', () => {
      const { setLoading } = useAuthStore.getState();
      
      setLoading(true);
      
      expect(useAuthStore.getState().loading).toBe(true);
    });
  });

  describe('fetchUserRole', () => {
    it('should fetch and set user role from RPC', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: 'parent',
        error: null,
      } as any);

      const { fetchUserRole } = useAuthStore.getState();
      const role = await fetchUserRole('test-user-id');
      
      expect(role).toBe('parent');
      expect(supabase.rpc).toHaveBeenCalledWith('get_primary_role', {
        p_user_id: 'test-user-id'
      });
    });

    it('should return null on RPC error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' },
      } as any);

      const { fetchUserRole } = useAuthStore.getState();
      const role = await fetchUserRole('test-user-id');
      
      expect(role).toBeNull();
    });

    it('should return null for invalid user ID', async () => {
      const { fetchUserRole } = useAuthStore.getState();
      const role = await fetchUserRole('');
      
      expect(role).toBeNull();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  describe('checkAdminRole', () => {
    it('should return true for admin role', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: 'admin',
        error: null,
      } as any);

      const { checkAdminRole } = useAuthStore.getState();
      const isAdmin = await checkAdminRole('test-user-id');
      
      expect(isAdmin).toBe(true);
    });

    it('should return true for read_only role', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: 'read_only',
        error: null,
      } as any);

      const { checkAdminRole } = useAuthStore.getState();
      const isAdmin = await checkAdminRole('test-user-id');
      
      expect(isAdmin).toBe(true);
    });

    it('should return false for parent role', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: 'parent',
        error: null,
      } as any);

      const { checkAdminRole } = useAuthStore.getState();
      const isAdmin = await checkAdminRole('test-user-id');
      
      expect(isAdmin).toBe(false);
    });

    it('should return false for child role', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: 'child',
        error: null,
      } as any);

      const { checkAdminRole } = useAuthStore.getState();
      const isAdmin = await checkAdminRole('test-user-id');
      
      expect(isAdmin).toBe(false);
    });

    it('should return false on RPC error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' },
      } as any);

      const { checkAdminRole } = useAuthStore.getState();
      const isAdmin = await checkAdminRole('test-user-id');
      
      expect(isAdmin).toBe(false);
    });
  });

  describe('signIn', () => {
    it('should sign in and set user state', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: 'parent',
        error: null,
      } as any);

      const { signIn } = useAuthStore.getState();
      const result = await signIn('test@example.com', 'password123');
      
      expect(result.error).toBeNull();
      expect(result.user).toEqual(mockUser);
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should return error for failed sign in', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', status: 401, name: 'AuthError' },
      } as any);

      const { signIn } = useAuthStore.getState();
      const result = await signIn('test@example.com', 'wrongpassword');
      
      expect(result.error).toBeTruthy();
      expect(result.error?.message).toBe('Invalid credentials');
    });
  });

  describe('signOut', () => {
    it('should sign out and clear state', async () => {
      // Set up initial authenticated state
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        userRole: 'parent',
        isAdmin: false,
      });

      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: null,
      } as any);

      const { signOut } = useAuthStore.getState();
      const result = await signOut();
      
      expect(result.error).toBeNull();
      
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.userRole).toBeNull();
      expect(state.isAdmin).toBe(false);
    });

    it('should handle sign out error gracefully', async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
        error: { message: 'Network error', status: 500, name: 'AuthError' },
      } as any);

      const { signOut } = useAuthStore.getState();
      const result = await signOut();
      
      // Should still clear local state even on error
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('should call resetPasswordForEmail with correct options', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
        data: {},
        error: null,
      } as any);

      const { resetPassword } = useAuthStore.getState();
      const result = await resetPassword('test@example.com');
      
      expect(result.error).toBeNull();
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/reset-password'),
        })
      );
    });

    it('should use admin redirect for admin type', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
        data: {},
        error: null,
      } as any);

      const { resetPassword } = useAuthStore.getState();
      await resetPassword('admin@example.com', 'admin');
      
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'admin@example.com',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/admin/reset-password'),
        })
      );
    });

    it('should return error on failure', async () => {
      vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
        data: null,
        error: { message: 'User not found', status: 404, name: 'AuthError' },
      } as any);

      const { resetPassword } = useAuthStore.getState();
      const result = await resetPassword('notfound@example.com');
      
      expect(result.error).toBeTruthy();
    });
  });

  describe('emergencyLogout', () => {
    it('should clear state immediately without API call', () => {
      // Set up initial authenticated state
      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        userRole: 'parent',
        isAdmin: false,
      });

      const { emergencyLogout } = useAuthStore.getState();
      emergencyLogout();
      
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.userRole).toBeNull();
      expect(state.isAdmin).toBe(false);
      expect(state.loading).toBe(false);
      
      // Should not call signOut API
      expect(supabase.auth.signOut).not.toHaveBeenCalled();
    });
  });
});
