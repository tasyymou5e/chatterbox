import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
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

// Mock dependent stores and services
vi.mock('@/utils/wideLogger', () => ({
  secureLog: { dev: vi.fn(), error: vi.fn(), warn: vi.fn(), security: vi.fn() },
  cLog: vi.fn(),
  cError: vi.fn(),
}));

vi.mock('@/services/authLoggingService', () => ({
  authLoggingService: {
    logActivity: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/hooks/useAuthSessionGuard', () => ({
  broadcastAuthEvent: vi.fn(),
}));

vi.mock('@/types/auth', () => ({
  isAdminRole: (role: string | null) => role === 'admin' || role === 'read_only',
}));

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
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset sub-stores
    const { useAuthSessionStore } = await import('@/stores/authSessionStore');
    const { useAuthRoleStore } = await import('@/stores/authRoleStore');
    
    useAuthSessionStore.setState({
      user: null,
      session: null,
      loading: false,
      sessionReady: false,
      isHydrated: true,
    });
    
    useAuthRoleStore.setState({
      userRole: null,
      isAdmin: false,
      isCheckingRole: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial values', async () => {
      const { useAuthStore } = await import('@/stores/authStore');
      const state = useAuthStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.userRole).toBeNull();
      expect(state.isAdmin).toBe(false);
    });
  });

  describe('state setters', () => {
    it('should set user correctly', async () => {
      const { useAuthStore } = await import('@/stores/authStore');
      const { setUser } = useAuthStore.getState();
      
      setUser(mockUser);
      
      // Sync happens immediately
      const { useAuthSessionStore } = await import('@/stores/authSessionStore');
      expect(useAuthSessionStore.getState().user).toEqual(mockUser);
    });

    it('should set session correctly', async () => {
      const { useAuthStore } = await import('@/stores/authStore');
      const { setSession } = useAuthStore.getState();
      
      setSession(mockSession);
      
      const { useAuthSessionStore } = await import('@/stores/authSessionStore');
      expect(useAuthSessionStore.getState().session).toEqual(mockSession);
    });

    it('should set userRole correctly', async () => {
      const { useAuthStore } = await import('@/stores/authStore');
      const { setUserRole } = useAuthStore.getState();
      
      setUserRole('parent');
      
      const { useAuthRoleStore } = await import('@/stores/authRoleStore');
      expect(useAuthRoleStore.getState().userRole).toBe('parent');
    });

    it('should set isAdmin correctly', async () => {
      const { useAuthStore } = await import('@/stores/authStore');
      const { setIsAdmin } = useAuthStore.getState();
      
      setIsAdmin(true);
      
      const { useAuthRoleStore } = await import('@/stores/authRoleStore');
      expect(useAuthRoleStore.getState().isAdmin).toBe(true);
    });

    it('should set loading correctly', async () => {
      const { useAuthStore } = await import('@/stores/authStore');
      const { setLoading } = useAuthStore.getState();
      
      setLoading(true);
      
      const { useAuthSessionStore } = await import('@/stores/authSessionStore');
      expect(useAuthSessionStore.getState().loading).toBe(true);
    });
  });

  describe('fetchUserRole', () => {
    it('should fetch and set user role from RPC', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: 'parent',
        error: null,
      } as any);

      const { useAuthStore } = await import('@/stores/authStore');
      const { fetchUserRole } = useAuthStore.getState();
      const role = await fetchUserRole('test-user-id');
      
      expect(role).toBe('parent');
      expect(supabase.rpc).toHaveBeenCalledWith('get_primary_role', {
        _user_id: 'test-user-id'
      });
    });

    it('should return null on RPC error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' },
      } as any);

      const { useAuthStore } = await import('@/stores/authStore');
      const { fetchUserRole } = useAuthStore.getState();
      const role = await fetchUserRole('test-user-id');
      
      expect(role).toBeNull();
    });
  });

  describe('checkAdminRole', () => {
    it('should return true for admin role', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: 'admin',
        error: null,
      } as any);

      const { useAuthStore } = await import('@/stores/authStore');
      const { checkAdminRole } = useAuthStore.getState();
      const isAdmin = await checkAdminRole('test-user-id');
      
      expect(isAdmin).toBe(true);
    });

    it('should return true for read_only role', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: 'read_only',
        error: null,
      } as any);

      const { useAuthStore } = await import('@/stores/authStore');
      const { checkAdminRole } = useAuthStore.getState();
      const isAdmin = await checkAdminRole('test-user-id');
      
      expect(isAdmin).toBe(true);
    });

    it('should return false for parent role', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: 'parent',
        error: null,
      } as any);

      const { useAuthStore } = await import('@/stores/authStore');
      const { checkAdminRole } = useAuthStore.getState();
      const isAdmin = await checkAdminRole('test-user-id');
      
      expect(isAdmin).toBe(false);
    });

    it('should return false on RPC error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' },
      } as any);

      const { useAuthStore } = await import('@/stores/authStore');
      const { checkAdminRole } = useAuthStore.getState();
      const isAdmin = await checkAdminRole('test-user-id');
      
      expect(isAdmin).toBe(false);
    });
  });

  describe('emergencyLogout', () => {
    it('should clear state immediately without API call', async () => {
      const { useAuthSessionStore } = await import('@/stores/authSessionStore');
      const { useAuthRoleStore } = await import('@/stores/authRoleStore');
      
      // Set up initial authenticated state
      useAuthSessionStore.setState({
        user: mockUser,
        session: mockSession,
      });
      useAuthRoleStore.setState({
        userRole: 'parent',
        isAdmin: false,
      });

      const { useAuthStore } = await import('@/stores/authStore');
      const { emergencyLogout } = useAuthStore.getState();
      emergencyLogout();
      
      const sessionState = useAuthSessionStore.getState();
      expect(sessionState.user).toBeNull();
      expect(sessionState.session).toBeNull();
      
      const roleState = useAuthRoleStore.getState();
      expect(roleState.userRole).toBeNull();
      expect(roleState.isAdmin).toBe(false);
      
      // Should not call signOut API
      expect(supabase.auth.signOut).not.toHaveBeenCalled();
    });
  });
});
