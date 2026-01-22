/**
 * Auth Session Store
 * 
 * @description Manages core session state (user, session, loading states).
 * Separated from auth actions for better maintainability and focused responsibility.
 * 
 * @module authSessionStore
 */
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuthRoleStore } from './authRoleStore';
import { isAdminRole } from '@/types/auth';
import { secureLog } from '@/utils/secureLogging';

/**
 * Auth session state interface.
 */
interface AuthSessionState {
  // State
  user: User | null;
  session: Session | null;
  loading: boolean;
  sessionReady: boolean;
  isHydrated: boolean;
  
  // Actions
  initialize: () => (() => void) | void;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setSessionReady: (ready: boolean) => void;
  clearSession: () => void;
}

/**
 * Session validation result
 */
interface SessionValidationResult {
  isValid: boolean;
  reason?: string;
  warning?: string;
  expiresAt?: string;
  minutesRemaining?: number;
}

/**
 * Validates a persisted session for integrity and expiration.
 * 
 * @description Performs comprehensive validation including:
 * - Session expiration check
 * - Access token presence
 * - User/session ID consistency
 * - Refresh token presence (warning only)
 */
function validatePersistedSession(
  session: Session | null, 
  user: User | null
): SessionValidationResult {
  // No session is valid (user just hasn't logged in)
  if (!session && !user) {
    return { isValid: true };
  }

  // Mismatched session/user state is corrupted
  if ((session && !user) || (!session && user)) {
    return { isValid: false, reason: 'Session/user state mismatch' };
  }

  // Session exists - validate it
  if (session) {
    // Check for required session properties
    if (!session.access_token) {
      return { isValid: false, reason: 'Session missing access token' };
    }

    // Check user ID consistency
    if (user && session.user?.id !== user.id) {
      return { isValid: false, reason: 'Session user ID mismatch' };
    }

    // Check expiration
    if (!session.expires_at) {
      return { isValid: false, reason: 'Session missing expiry timestamp' };
    }

    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    
    if (expiresAt < now) {
      return { isValid: false, reason: 'Session expired' };
    }

    const minutesRemaining = Math.round((expiresAt.getTime() - now.getTime()) / 60000);
    
    // Warn if session is close to expiring (< 5 minutes)
    const warning = minutesRemaining < 5 
      ? `Session expiring soon (${minutesRemaining} minutes remaining)` 
      : undefined;

    // Warn if no refresh token (session can't be renewed)
    const refreshWarning = !session.refresh_token 
      ? 'Session missing refresh token - cannot auto-renew' 
      : warning;

    return { 
      isValid: true, 
      warning: refreshWarning,
      expiresAt: expiresAt.toISOString(),
      minutesRemaining
    };
  }

  return { isValid: true };
}

export const useAuthSessionStore = create<AuthSessionState>()(
  subscribeWithSelector(
    devtools(
      persist(
      (set, get) => ({
        // Initial state
        user: null,
        session: null,
        loading: true,
        sessionReady: false,
        isHydrated: false,

        // State setters
        setUser: (user) => set({ user }),
        setSession: (session) => set({ session }),
        setLoading: (loading) => set({ loading }),
        setSessionReady: (sessionReady) => set({ sessionReady }),
        
        /**
         * Clear all session state - used on logout
         */
        clearSession: () => set({
          user: null,
          session: null,
          loading: false,
          sessionReady: false,
        }),

        /**
         * Initialize authentication state listener
         */
        initialize: () => {
          const currentState = get();
          if (currentState.sessionReady) {
            return;
          }

          set({ loading: true });
          const roleStore = useAuthRoleStore.getState();

          // Set up auth state listener
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (event === 'SIGNED_IN' && session) {
                set({ 
                  session, 
                  user: session?.user ?? null,
                  loading: false,
                  sessionReady: true
                });

                // Handle role checking when user signs in
                roleStore.fetchUserRole(session.user.id).catch(() => {
                  roleStore.clearRoles();
                });
              } else if (event === 'SIGNED_OUT') {
                set({ 
                  session: null, 
                  user: null,
                  loading: false,
                  sessionReady: true
                });
                roleStore.clearRoles();
              } else if (event === 'TOKEN_REFRESHED' && session) {
                set({ session, user: session.user });
              }
            }
          );

          // Check for existing session
          supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
              set({ 
                session, 
                user: session.user,
                loading: false,
                sessionReady: true
              });
              
              // Re-validate role on session restore
              try {
                const role = await roleStore.fetchUserRole(session.user.id);
                const hasAdminAccess = isAdminRole(role);
                roleStore.setIsAdmin(hasAdminAccess);
              } catch {
                roleStore.clearRoles();
              }
            } else {
              set({ 
                session: null, 
                user: null,
                loading: false,
                sessionReady: true
              });
              roleStore.clearRoles();
            }
          }).catch(() => {
            set({ 
              loading: false, 
              sessionReady: true
            });
            roleStore.clearRoles();
          });

          return () => subscription.unsubscribe();
        },
      }),
      {
        name: 'auth-session-store',
        // Only persist non-sensitive session data
        partialize: (state) => ({
          user: state.user,
          session: state.session,
        }),
        onRehydrateStorage: () => (state, error) => {
          // Handle hydration errors
          if (error) {
            secureLog.error('Auth session store hydration failed', error, 'AuthSessionStore');
            try {
              localStorage.removeItem('auth-session-store');
            } catch {
              // Silent fail
            }
            return;
          }

          if (!state) {
            secureLog.dev('Auth session store: No state to rehydrate');
            return;
          }

          state.isHydrated = true;

          // Comprehensive session validation
          const validationResult = validatePersistedSession(state.session, state.user);
          
          if (!validationResult.isValid) {
            secureLog.dev(`Auth session store: ${validationResult.reason}, clearing`);
            
            // Clear corrupted/expired session data
            state.user = null;
            state.session = null;
            state.sessionReady = false;
            
            // Also clear localStorage to prevent stale data issues
            try {
              localStorage.removeItem('auth-session-store');
            } catch {
              // Silent fail - storage may be unavailable
            }
          } else if (validationResult.warning) {
            secureLog.dev(`Auth session store: ${validationResult.warning}`);
            secureLog.dev('Auth session store rehydrated with valid session', {
              expiresAt: validationResult.expiresAt,
              minutesRemaining: validationResult.minutesRemaining
            });
          } else {
            secureLog.dev('Auth session store rehydrated (no session)');
          }
        },
      }
    ),
      { name: 'AuthSessionStore' }
    )
  )
);
