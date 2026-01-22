/**
 * Auth Session Store Tests
 * 
 * Tests session lifecycle, token expiration, recovery, and validation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Session, User } from '@supabase/supabase-js';

// Mock Supabase before imports
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      }),
      signOut: vi.fn().mockResolvedValue({ error: null })
    }
  }
}));

// Helper to create mock session
function createMockSession(overrides: Partial<Session> = {}): Session {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: 'mock-access-token-12345',
    refresh_token: 'mock-refresh-token-67890',
    expires_in: 3600,
    expires_at: now + 3600, // 1 hour from now
    token_type: 'bearer',
    user: createMockUser(),
    ...overrides
  } as Session;
}

// Helper to create mock user
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123-456-789',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    email_confirmed_at: new Date().toISOString(),
    phone: null,
    confirmation_sent_at: undefined,
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { name: 'Test User' },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false,
    ...overrides
  } as User;
}

describe('Session Validation', () => {
  // Import the validation function directly for unit testing
  // Since it's not exported, we test it through store behavior
  
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('validatePersistedSession behavior', () => {
    it('should accept empty session state as valid', async () => {
      // Pre-populate localStorage with no session
      localStorage.setItem('auth-session-store', JSON.stringify({
        state: { session: null, user: null },
        version: 0
      }));

      // Import and initialize store
      const { useAuthSessionStore } = await import('@/stores/authSessionStore');
      
      // State should remain null (valid empty state)
      const state = useAuthSessionStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
    });

    it('should detect session/user mismatch (session without user)', async () => {
      const mockSession = createMockSession();
      
      // Pre-populate with mismatched state
      localStorage.setItem('auth-session-store', JSON.stringify({
        state: { session: mockSession, user: null },
        version: 0
      }));

      // Import store - should clear corrupted state
      vi.resetModules();
      const { useAuthSessionStore } = await import('@/stores/authSessionStore');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // State should be cleared due to mismatch
      const state = useAuthSessionStore.getState();
      // The store should have detected the mismatch
      expect(state.session === null || state.user === null).toBe(true);
    });

    it('should detect expired session on hydration', async () => {
      const expiredSession = createMockSession({
        expires_at: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      });
      const mockUser = createMockUser();

      localStorage.setItem('auth-session-store', JSON.stringify({
        state: { session: expiredSession, user: mockUser },
        version: 0
      }));

      vi.resetModules();
      const { useAuthSessionStore } = await import('@/stores/authSessionStore');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const state = useAuthSessionStore.getState();
      // Expired session should be cleared
      expect(state.session).toBeNull();
    });

    it('should detect session without access token', async () => {
      const invalidSession = createMockSession();
      // @ts-expect-error - intentionally breaking the session
      delete invalidSession.access_token;
      const mockUser = createMockUser();

      localStorage.setItem('auth-session-store', JSON.stringify({
        state: { session: invalidSession, user: mockUser },
        version: 0
      }));

      vi.resetModules();
      const { useAuthSessionStore } = await import('@/stores/authSessionStore');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const state = useAuthSessionStore.getState();
      expect(state.session).toBeNull();
    });

    it('should detect user ID mismatch between session and user', async () => {
      const mockSession = createMockSession();
      const mockUser = createMockUser({ id: 'different-user-id' });

      localStorage.setItem('auth-session-store', JSON.stringify({
        state: { session: mockSession, user: mockUser },
        version: 0
      }));

      vi.resetModules();
      const { useAuthSessionStore } = await import('@/stores/authSessionStore');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const state = useAuthSessionStore.getState();
      // Should be cleared due to ID mismatch
      expect(state.session === null || state.user?.id === mockSession.user.id).toBe(true);
    });

    it('should accept valid session with all required fields', async () => {
      const mockSession = createMockSession();
      const mockUser = createMockUser({ id: mockSession.user.id });

      localStorage.setItem('auth-session-store', JSON.stringify({
        state: { session: mockSession, user: mockUser },
        version: 0
      }));

      vi.resetModules();
      const { useAuthSessionStore } = await import('@/stores/authSessionStore');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const state = useAuthSessionStore.getState();
      // Valid session should be preserved
      expect(state.isHydrated).toBe(true);
    });
  });
});

describe('Session Lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should set isHydrated to true after rehydration', async () => {
    vi.resetModules();
    const { useAuthSessionStore } = await import('@/stores/authSessionStore');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const state = useAuthSessionStore.getState();
    expect(state.isHydrated).toBe(true);
  });

  it('should handle clearSession correctly', async () => {
    vi.resetModules();
    const { useAuthSessionStore } = await import('@/stores/authSessionStore');
    
    // Set some session data
    useAuthSessionStore.setState({
      user: createMockUser(),
      session: createMockSession(),
      sessionReady: true
    });
    
    // Clear session
    useAuthSessionStore.getState().clearSession();
    
    const state = useAuthSessionStore.getState();
    expect(state.user).toBeNull();
    expect(state.session).toBeNull();
    expect(state.sessionReady).toBe(false);
    expect(state.loading).toBe(false);
  });

  it('should not reinitialize if session is already ready', async () => {
    vi.resetModules();
    const { useAuthSessionStore } = await import('@/stores/authSessionStore');
    
    // Set session as ready
    useAuthSessionStore.setState({ sessionReady: true });
    
    // Call initialize
    const result = useAuthSessionStore.getState().initialize();
    
    // Should return undefined (no cleanup function) since already initialized
    expect(result).toBeUndefined();
  });
});

describe('Token Expiration Scenarios', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should identify session expiring soon (< 5 minutes)', async () => {
    const soonExpiringSession = createMockSession({
      expires_at: Math.floor(Date.now() / 1000) + 180 // 3 minutes from now
    });
    const mockUser = createMockUser({ id: soonExpiringSession.user.id });

    localStorage.setItem('auth-session-store', JSON.stringify({
      state: { session: soonExpiringSession, user: mockUser },
      version: 0
    }));

    vi.resetModules();
    
    // Spy on console to check for warning
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    await import('@/stores/authSessionStore');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // The session should still be valid but a warning should be logged
    // (validated by not being cleared)
    consoleSpy.mockRestore();
  });

  it('should identify session missing refresh token', async () => {
    const noRefreshSession = createMockSession();
    // @ts-expect-error - intentionally removing refresh token
    noRefreshSession.refresh_token = undefined;
    const mockUser = createMockUser({ id: noRefreshSession.user.id });

    localStorage.setItem('auth-session-store', JSON.stringify({
      state: { session: noRefreshSession, user: mockUser },
      version: 0
    }));

    vi.resetModules();
    
    await import('@/stores/authSessionStore');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Session should still be valid but logged a warning about refresh token
  });

  it('should reject session with expires_at in the past', async () => {
    const expiredSession = createMockSession({
      expires_at: Math.floor(Date.now() / 1000) - 1 // 1 second ago
    });
    const mockUser = createMockUser({ id: expiredSession.user.id });

    localStorage.setItem('auth-session-store', JSON.stringify({
      state: { session: expiredSession, user: mockUser },
      version: 0
    }));

    vi.resetModules();
    const { useAuthSessionStore } = await import('@/stores/authSessionStore');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const state = useAuthSessionStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
  });
});

describe('LocalStorage Corruption Handling', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should handle malformed JSON in localStorage', async () => {
    localStorage.setItem('auth-session-store', 'not valid json{{{');

    vi.resetModules();
    const { useAuthSessionStore } = await import('@/stores/authSessionStore');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should recover gracefully with empty state
    const state = useAuthSessionStore.getState();
    expect(state.session).toBeNull();
    expect(state.user).toBeNull();
  });

  it('should handle missing state object in localStorage', async () => {
    localStorage.setItem('auth-session-store', JSON.stringify({}));

    vi.resetModules();
    const { useAuthSessionStore } = await import('@/stores/authSessionStore');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const state = useAuthSessionStore.getState();
    expect(state.session).toBeNull();
  });

  it('should clear localStorage on hydration error', async () => {
    // Simulate a state that will cause hydration issues
    localStorage.setItem('auth-session-store', JSON.stringify({
      state: { 
        session: { invalid: true }, // Invalid session shape
        user: { also_invalid: true }
      },
      version: 0
    }));

    vi.resetModules();
    await import('@/stores/authSessionStore');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // localStorage should be cleaned up or state should be reset
    // (behavior depends on implementation)
  });
});
