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
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.isHydrated = true;
            
            // Validate persisted session is still valid
            if (state.session?.expires_at) {
              const expiresAt = new Date(state.session.expires_at * 1000);
              const now = new Date();
              const isExpired = expiresAt < now;
              
              if (isExpired) {
                secureLog.dev('Auth session store: Persisted session expired, clearing');
                // Clear expired session data
                state.user = null;
                state.session = null;
                state.sessionReady = false;
              } else {
                secureLog.dev('Auth session store rehydrated with valid session', {
                  expiresAt: expiresAt.toISOString(),
                  minutesRemaining: Math.round((expiresAt.getTime() - now.getTime()) / 60000)
                });
              }
            } else if (state.session) {
              // Session exists but no expiry - treat as invalid
              secureLog.dev('Auth session store: Session missing expiry, clearing');
              state.user = null;
              state.session = null;
              state.sessionReady = false;
            } else {
              secureLog.dev('Auth session store rehydrated (no session)');
            }
          }
        },
      }
    ),
      { name: 'AuthSessionStore' }
    )
  )
);
