import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import type { User, Session } from '@supabase/supabase-js';

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: { first_name: 'Test', last_name: 'User' },
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

describe('useAuth', () => {
  const mockSignIn = vi.fn();
  const mockSignUp = vi.fn();
  const mockSignOut = vi.fn();
  const mockResetPassword = vi.fn();
  const mockFetchUserRole = vi.fn();
  const mockCheckAdminRole = vi.fn();

  beforeEach(() => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: null,
      session: null,
      userRole: null,
      isAdmin: false,
      loading: false,
      isHydrated: true,
      isInitialized: true,
      signIn: mockSignIn,
      signUp: mockSignUp,
      signOut: mockSignOut,
      resetPassword: mockResetPassword,
      fetchUserRole: mockFetchUserRole,
      checkAdminRole: mockCheckAdminRole,
      setUser: vi.fn(),
      setSession: vi.fn(),
      setUserRole: vi.fn(),
      setIsAdmin: vi.fn(),
      setLoading: vi.fn(),
      emergencyLogout: vi.fn(),
      initializeAuth: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns null user when not authenticated', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.userRole).toBeNull();
    });

    it('returns user when authenticated', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: mockUser,
        session: mockSession,
        userRole: 'parent',
        isAdmin: false,
        loading: false,
        isHydrated: true,
        isInitialized: true,
        signIn: mockSignIn,
        signUp: mockSignUp,
        signOut: mockSignOut,
        resetPassword: mockResetPassword,
        fetchUserRole: mockFetchUserRole,
        checkAdminRole: mockCheckAdminRole,
        setUser: vi.fn(),
        setSession: vi.fn(),
        setUserRole: vi.fn(),
        setIsAdmin: vi.fn(),
        setLoading: vi.fn(),
        emergencyLogout: vi.fn(),
        initializeAuth: vi.fn(),
      });

      const { result } = renderHook(() => useAuth());
      
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.userRole).toBe('parent');
    });
  });

  describe('signIn', () => {
    it('calls signIn with correct credentials', async () => {
      mockSignIn.mockResolvedValue({ user: mockUser, error: null });

      const { result } = renderHook(() => useAuth());
      
      await result.current.signIn('test@example.com', 'password123');
      
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    it('returns error on failed sign in', async () => {
      const error = { message: 'Invalid credentials' };
      mockSignIn.mockResolvedValue({ user: null, error });

      const { result } = renderHook(() => useAuth());
      
      const response = await result.current.signIn('test@example.com', 'wrong');
      
      expect(response.error).toEqual(error);
    });
  });

  describe('signUp', () => {
    it('calls signUp with correct data', async () => {
      mockSignUp.mockResolvedValue({ user: mockUser, error: null });

      const { result } = renderHook(() => useAuth());
      
      await result.current.signUp('new@example.com', 'password123', {
        first_name: 'New',
        last_name: 'User',
      });
      
      expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'password123', {
        first_name: 'New',
        last_name: 'User',
      });
    });
  });

  describe('signOut', () => {
    it('calls signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());
      
      await result.current.signOut();
      
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('calls resetPassword with email', async () => {
      mockResetPassword.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());
      
      await result.current.resetPassword('test@example.com');
      
      expect(mockResetPassword).toHaveBeenCalledWith('test@example.com', undefined);
    });

    it('calls resetPassword with admin type', async () => {
      mockResetPassword.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth());
      
      await result.current.resetPassword('admin@example.com', 'admin');
      
      expect(mockResetPassword).toHaveBeenCalledWith('admin@example.com', 'admin');
    });
  });

  describe('isAdmin', () => {
    it('returns false when not admin', () => {
      const { result } = renderHook(() => useAuth());
      
      expect(result.current.isAdmin).toBe(false);
    });

    it('returns true when admin', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: mockUser,
        session: mockSession,
        userRole: 'admin',
        isAdmin: true,
        loading: false,
        isHydrated: true,
        isInitialized: true,
        signIn: mockSignIn,
        signUp: mockSignUp,
        signOut: mockSignOut,
        resetPassword: mockResetPassword,
        fetchUserRole: mockFetchUserRole,
        checkAdminRole: mockCheckAdminRole,
        setUser: vi.fn(),
        setSession: vi.fn(),
        setUserRole: vi.fn(),
        setIsAdmin: vi.fn(),
        setLoading: vi.fn(),
        emergencyLogout: vi.fn(),
        initializeAuth: vi.fn(),
      });

      const { result } = renderHook(() => useAuth());
      
      expect(result.current.isAdmin).toBe(true);
    });
  });

  describe('loading state', () => {
    it('returns loading state from store', () => {
      vi.mocked(useAuthStore).mockReturnValue({
        user: null,
        session: null,
        userRole: null,
        isAdmin: false,
        loading: true,
        isHydrated: true,
        isInitialized: false,
        signIn: mockSignIn,
        signUp: mockSignUp,
        signOut: mockSignOut,
        resetPassword: mockResetPassword,
        fetchUserRole: mockFetchUserRole,
        checkAdminRole: mockCheckAdminRole,
        setUser: vi.fn(),
        setSession: vi.fn(),
        setUserRole: vi.fn(),
        setIsAdmin: vi.fn(),
        setLoading: vi.fn(),
        emergencyLogout: vi.fn(),
        initializeAuth: vi.fn(),
      });

      const { result } = renderHook(() => useAuth());
      
      expect(result.current.loading).toBe(true);
    });
  });
});
