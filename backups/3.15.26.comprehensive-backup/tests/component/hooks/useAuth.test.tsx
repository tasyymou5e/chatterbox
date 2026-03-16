import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import type { User, Session } from '@supabase/supabase-js';

// Mock the auth store
vi.mock('@/stores/authStore', () => {
  const mockGetState = vi.fn();
  const mockStore = Object.assign(
    vi.fn(),
    { getState: mockGetState }
  );
  return { useAuthStore: mockStore };
});

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

const createMockStoreState = (overrides = {}) => ({
  user: null,
  session: null,
  userRole: null,
  isAdmin: false,
  loading: false,
  isHydrated: true,
  sessionReady: false,
  initialize: vi.fn(),
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  ...overrides,
});

describe('useAuth', () => {
  const mockSignIn = vi.fn();
  const mockSignUp = vi.fn();
  const mockSignOut = vi.fn();
  const mockResetPassword = vi.fn();

  beforeEach(() => {
    const defaultState = createMockStoreState({
      signIn: mockSignIn,
      signUp: mockSignUp,
      signOut: mockSignOut,
      resetPassword: mockResetPassword,
    });
    
    vi.mocked(useAuthStore).mockReturnValue(defaultState as any);
    (useAuthStore as any).getState.mockReturnValue({ resetPassword: mockResetPassword });
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
      vi.mocked(useAuthStore).mockReturnValue(createMockStoreState({
        user: mockUser,
        session: mockSession,
        userRole: 'parent',
        signIn: mockSignIn,
        signUp: mockSignUp,
        signOut: mockSignOut,
        resetPassword: mockResetPassword,
      }) as any);

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
      
      await result.current.signUp('new@example.com', 'password123', 'New', 'User');
      
      expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'password123', 'New', 'User');
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

  describe('loading state', () => {
    it('returns loading when store is loading', () => {
      vi.mocked(useAuthStore).mockReturnValue(createMockStoreState({
        loading: true,
        signIn: mockSignIn,
        signUp: mockSignUp,
        signOut: mockSignOut,
        resetPassword: mockResetPassword,
      }) as any);

      const { result } = renderHook(() => useAuth());
      
      expect(result.current.loading).toBe(true);
    });

    it('returns loading when not hydrated', () => {
      vi.mocked(useAuthStore).mockReturnValue(createMockStoreState({
        loading: false,
        isHydrated: false,
        signIn: mockSignIn,
        signUp: mockSignUp,
        signOut: mockSignOut,
        resetPassword: mockResetPassword,
      }) as any);

      const { result } = renderHook(() => useAuth());
      
      expect(result.current.loading).toBe(true);
    });
  });
});
